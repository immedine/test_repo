'use strict';

module.exports = function (app) {
  /**
   * Service to handle offline order operations.
   */

  /**
   * Creates an offline order.
   * @param {Object} orderData - Order details
   * @param {Object} userData - User/Restaurant owner details
   * @returns {Promise<Object>} Created order
   */
  const createOfflineOrder = async (orderData, userData) => {
    const tableSession = app.module.tableSession;
    const inventory = app.module.inventory;
    const order = app.module.order;
    const kot = app.module.kot;
    const bill = app.module.bill;
    const table = app.module.table;

    const inventoryOutput =
      await inventory.updateInventoryCount(
        orderData.cart,
        undefined,
        userData
      );

    const orderOutput =
      await order.create(
        orderData,
        userData
      );

    // Create KOT
    const kotItems = orderData.cart.map(item => ({
      menuRef: item.menuRef,
      menuName: item.name,
      quantity: item.quantity,
      operation: "add",
      subItems: item.subItems
        ? item.subItems.map(sub => ({
          menuRef: item.menuRef,
          name: sub.name,
          quantity: sub.quantity,
          price: sub.price,
          operation: "add"
        }))
        : []
    }));

    await kot.create({
      orderRef: orderOutput._id,
      restaurantRef: userData.restaurantRef,
      items: kotItems
    }, userData).catch(err => {
      console.log("err creating KOT", err);
    });

    const billObj = {
      offlineId: orderData.idbId,
      billNo: orderOutput.orderId,
      orderRef: orderOutput._id,
      subTotal: orderData.subTotal,
      total: orderData.total,
      gstDetails: orderData.gstDetails,
      serviceTaxDetails: orderData.serviceTaxDetails,
      paymentDetails: orderData.paymentDetails
    };

    if (orderData.status === app.config.contentManagement.order.completed) {
      billObj.isRoundOff = orderData.isRoundOff;
      billObj.isCGSTDisabled = orderData.isCGSTDisabled;
      billObj.isServiceTaxDisabled = orderData.isServiceTaxDisabled;
      billObj.isSGSTDisabled = orderData.isSGSTDisabled;
      billObj.discountDetails = orderData.discountDetails;
    }

    const billOutput = await bill.create(billObj, userData);

    orderOutput.billDetails = billOutput;

    order.updateBillDetails(
      orderOutput._id,
      billOutput
    ).catch(err => {
      console.log("err updateBillDetails", err);
    });

    if (orderData.tableRef && orderData.status !== app.config.contentManagement.order.completed &&
      orderData.status !== app.config.contentManagement.order.deleted) {
      const tableSessionOutput =
        await tableSession.createTableSessionFromOwnerOffline(
          orderData,
          userData
        );
      table.markAsUnavailable(
        orderData.tableRef,
        tableSessionOutput._id
      ).catch(err => {
        console.log("err markAsUnavailable", err);
      });

      tableSessionOutput.orderRef = orderOutput._id;

      tableSession.edit(
        tableSessionOutput
      ).catch(err => {
        console.log("err tableSession", err);
      });
    }

    inventory.updateHistoryOrderRef(
      inventoryOutput.invIds,
      orderOutput._id
    ).catch(err => {
      console.log(
        "err updateHistoryOrderRef",
        err
      );
    });

    return orderOutput;
  };

  /**
   * Updates an existing offline order.
   * @param {Object} orderDataInput - Input data for update
   * @param {Object} userData - User/Restaurant owner details
   * @returns {Promise<Object>} Updated order
   */
  const updateOfflineOrder = async (orderDataInput, userData) => {
    const order = app.module.order;
    const inventory = app.module.inventory;
    const bill = app.module.bill;
    const kot = app.module.kot;
    const tableSession = app.module.tableSession;
    const table = app.module.table;

    const orderData = await order.getOrderByIdbId(
      orderDataInput.idbId,
      userData
    );

    if (!orderData) {
      throw new Error(
        `Order not found: ${orderDataInput.idbId}`
      );
    }

    const oldTableId = orderData.tableRef;
    const oldOrderDataItems = [...orderData.cart];

    orderData.reOrderCount = orderData.reOrderCount
      ? orderData.reOrderCount + 1
      : 1;

    if (
      orderDataInput &&
      Object.keys(orderDataInput).length
    ) {
      for (const item in orderDataInput) {
        orderData[item] = orderDataInput[item];
      }
    }

    /*
     * Rollback inventory based on the updated cart.
     */
    await inventory.rollbackInventory(
      orderData._id,
      orderDataInput.cart,
      false,
      orderData.reOrderCount,
      userData
    );

    /*
     * Update the actual order.
     */
    const output = await order.edit(
      orderData,
      userData
    );

    /*
     * Update bill.
     */
    const billObj = {
      subTotal: orderDataInput.subTotal,
      total: orderDataInput.total,
      gstDetails: orderDataInput.gstDetails,
      serviceTaxDetails: orderDataInput.serviceTaxDetails
    };

    if (orderDataInput.status === app.config.contentManagement.order.completed) {
      billObj.isRoundOff = orderDataInput.isRoundOff;
      billObj.isCGSTDisabled = orderDataInput.isCGSTDisabled;
      billObj.isServiceTaxDisabled = orderDataInput.isServiceTaxDisabled;
      billObj.isSGSTDisabled = orderDataInput.isSGSTDisabled;
      billObj.discountDetails = orderDataInput.discountDetails;
      billObj.paymentDetails = orderDataInput.paymentDetails;
    }

    const billRes = await bill.updateBillFromOrder(
      orderData.billRef,
      billObj
    );

    /*
     * Generate KOT items by comparing
     * old cart with new cart.
     */
    // Helper function to compare subItems and return differences with correct operations
    const getSubItemChanges = (oldSubItems, newSubItems, menuRef, itemQuantityDiff = 0) => {
      const changes = [];
      const oldSubItemsArr = oldSubItems || [];
      const newSubItemsArr = newSubItems || [];
      const oldSubItemNames = oldSubItemsArr.map(s => s.name);
      const newSubItemNames = newSubItemsArr.map(s => s.name);

      // Add new subItems (in new but not in old) - add the difference quantity
      newSubItemsArr.forEach(sub => {
        if (!oldSubItemNames.includes(sub.name)) {
          changes.push({
            menuRef: menuRef,
            name: sub.name,
            quantity: sub.quantity,
            price: sub.price,
            operation: 'add'
          });
        }
      });

      // Check for quantity changes in existing subItems (same name but different quantity) - add/remove difference only
      newSubItemsArr.forEach(newSub => {
        const oldSub = oldSubItemsArr.find(s => s.name === newSub.name);
        if (oldSub && oldSub.quantity !== newSub.quantity) {
          const quantityDiff = Math.abs(newSub.quantity - oldSub.quantity);
          changes.push({
            menuRef: menuRef,
            name: newSub.name,
            quantity: quantityDiff,
            price: newSub.price,
            operation: newSub.quantity > oldSub.quantity ? 'add' : 'remove'
          });
        }
      });

      // Remove old subItems (in old but not in new) - remove full quantity
      oldSubItemsArr.forEach(sub => {
        if (!newSubItemNames.includes(sub.name)) {
          changes.push({
            menuRef: menuRef,
            name: sub.name,
            quantity: sub.quantity,
            price: sub.price,
            operation: 'remove'
          });
        }
      });

      return changes;
    };

    // Function to generate KOT items by comparing old order items with new cart items
    const generateKOTItems = (oldOrderItems, newCart) => {
      const kotItems = [];

      // Check for new items and quantity increases
      newCart.forEach(newItem => {
        const oldItem = oldOrderItems.find(old =>
          old.menuRef && newItem.menuRef && old.menuRef.toString() === newItem.menuRef.toString()
        );

        if (!oldItem) {
          // New item added - add full quantity
          kotItems.push({
            menuRef: newItem.menuRef,
            menuName: newItem.name,
            quantity: newItem.quantity,
            operation: 'add',
            subItems: newItem.subItems ? newItem.subItems.map(sub => ({
              menuRef: newItem.menuRef,
              name: sub.name,
              quantity: sub.quantity,
              price: sub.price,
              operation: 'add'
            })) : []
          });
        } else if (newItem.quantity > oldItem.quantity) {
          // Quantity increased - add the difference only
          const quantityDiff = newItem.quantity - oldItem.quantity;
          // Get subItem changes comparing old vs new (passing quantityDiff for proportional calculation)
          const subItemChanges = getSubItemChanges(oldItem.subItems, newItem.subItems, newItem.menuRef, quantityDiff);
          kotItems.push({
            menuRef: newItem.menuRef,
            menuName: newItem.name,
            quantity: quantityDiff,
            operation: 'add',
            subItems: subItemChanges
          });
        } else if (newItem.quantity === oldItem.quantity) {
          // Quantity same - check for subItem changes only (only add subItems, not the item itself)
          const subItemChanges = getSubItemChanges(oldItem.subItems, newItem.subItems, newItem.menuRef);
          if (subItemChanges.length > 0) {
            // Only add subItems to KOT, not the item with quantity 0
            subItemChanges.forEach(subChange => {
              kotItems.push({
                menuRef: subChange.menuRef,
                menuName: subChange.name,
                quantity: subChange.quantity,
                operation: subChange.operation,
                subItems: [],
                isSubItemOnly: true
              });
            });
          }
        }
      });

      // Check for removed items and quantity decreases
      oldOrderItems.forEach(oldItem => {
        const newItem = newCart.find(newItem =>
          newItem.menuRef && oldItem.menuRef && newItem.menuRef.toString() === oldItem.menuRef.toString()
        );

        if (!newItem) {
          // Item completely removed - remove full quantity
          kotItems.push({
            menuRef: oldItem.menuRef,
            menuName: oldItem.name,
            quantity: oldItem.quantity,
            operation: 'remove',
            subItems: oldItem.subItems ? oldItem.subItems.map(sub => ({
              menuRef: oldItem.menuRef,
              name: sub.name,
              quantity: sub.quantity,
              price: sub.price,
              operation: 'remove'
            })) : []
          });
        } else if (oldItem.quantity > newItem.quantity) {
          // Quantity decreased - remove the difference only
          const quantityDiff = oldItem.quantity - newItem.quantity;
          // Get subItem changes comparing old vs new (passing quantityDiff for proportional calculation)
          const subItemChanges = getSubItemChanges(oldItem.subItems, newItem.subItems, oldItem.menuRef, quantityDiff);
          kotItems.push({
            menuRef: oldItem.menuRef,
            menuName: oldItem.name,
            quantity: quantityDiff,
            operation: 'remove',
            subItems: subItemChanges
          });
        }
      });

      return kotItems;
    };

    const kotItems = generateKOTItems(
      oldOrderDataItems,
      orderDataInput.cart || []
    );

    /*
     * Create KOT if required.
     */
    if (kotItems.length > 0) {
      await kot.create(
        {
          orderRef: orderData._id,
          restaurantRef: userData.restaurantRef,
          items: kotItems
        },
        userData
      );
    }

    if (orderDataInput.status !== app.config.contentManagement.order.completed &&
      orderDataInput.status !== app.config.contentManagement.order.deleted
    ) {
      /*
     * Handle table changes.
     */
      if (
        orderDataInput.tableRef &&
        oldTableId &&
        orderDataInput.tableRef.toString() ===
        oldTableId.toString()
      ) {
        await tableSession.updateCartByOrderId(
          orderData._id,
          orderData.restaurantRef,
          orderDataInput.cart
        );
      }

      /*
       * Table has changed.
       */
      if (
        orderDataInput.tableRef &&
        (
          !oldTableId ||
          (
            oldTableId &&
            orderDataInput.tableRef.toString() !==
            oldTableId.toString()
          )
        )
      ) {
        orderDataInput.orderRef = orderData._id;

        // Close old table session
        await tableSession.updateStatusByOrderId(
          orderData._id,
          orderData.restaurantRef
        );

        // Create new table session
        const tableSessionRes =
          await tableSession.createTableSessionFromOwnerOffline(
            orderDataInput,
            userData
          );

        await table.markAsUnavailable(
          orderDataInput.tableRef,
          tableSessionRes._id
        );
      }
    }


    output.billRef = billRes;

    return output;
  };

  const getOrderByIdbId = async function (orderDataInput, userRef) {
    const order = app.module.order;

    const orderData = await order.getOrderByIdbId(
      orderDataInput.idbId,
      userRef
    );

    return orderData;
  };

  return {
    createOfflineOrder,
    updateOfflineOrder,
    getOrderByIdbId
  };
};
