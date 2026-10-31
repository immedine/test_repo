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

    const idbId = orderData.idbId;

    if (!idbId) {
      throw new Error("idbId is required for offline order");
    }

    // -------------------------------------------------------
    // STEP 1: Find/create Order
    // -------------------------------------------------------

    let orderOutput = await order.getOrderByIdbId(
      idbId,
      userData,
      true
    );

    if (!orderOutput) {
      const createData = {
        ...orderData,
        isOnline: false
      };

      delete createData.updatedAt;

      if (orderData.status === app.config.contentManagement.order.deleted) {
        createData.isRestoredWhileCancel = !orderData.noRevertBack;
      }

      try {
        orderOutput = await order.create(
          createData,
          userData
        );
      } catch (err) {
        throw err;
      }
    }

    if (!orderOutput) {
      throw new Error(
        `Unable to create/find offline order ${idbId}`
      );
    }

    // return orderOutput;

    // -------------------------------------------------------
    // STEP 2: Create KOT if it doesn't exist
    // -------------------------------------------------------

    const existingKot = await kot.getByOrder(orderOutput._id, userData);

    if (!existingKot) {
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

      try {
        await kot.create({
          orderRef: orderOutput._id,
          restaurantRef: userData.restaurantRef,
          items: kotItems
        }, userData);
      } catch (err) {
        console.log("err creating KOT", err);
      }
    }

    // -------------------------------------------------------
    // STEP 3: Create Bill if it doesn't exist
    // -------------------------------------------------------

    let billOutput = await bill.getByOfflineId(idbId, userData, true);

    if (!billOutput) {
      const billObj = {
        offlineId: idbId,
        billNo: orderOutput.orderId,
        orderRef: orderOutput._id,
        subTotal: orderData.subTotal,
        total: orderData.total,
        gstDetails: orderData.gstDetails,
        serviceTaxDetails: orderData.serviceTaxDetails,
        paymentDetails: orderData.paymentDetails
      };

      if (orderData.status === app.config.contentManagement.order.completed ||
        orderData.status === app.config.contentManagement.order.deleted
      ) {
        billObj.isRoundOff = orderData.isRoundOff !== undefined ? orderData.isRoundOff : billObj.isRoundOff;
        billObj.isCGSTDisabled = orderData.isCGSTDisabled !== undefined ? orderData.isCGSTDisabled : billObj.isCGSTDisabled;
        billObj.isServiceTaxDisabled = orderData.isServiceTaxDisabled !== undefined ? orderData.isServiceTaxDisabled : billObj.isServiceTaxDisabled;
        billObj.isSGSTDisabled = orderData.isSGSTDisabled !== undefined ? orderData.isSGSTDisabled : billObj.isSGSTDisabled;
        billObj.discountDetails = orderData.discountDetails !== undefined ? orderData.discountDetails : billObj.discountDetails;
        billObj.paymentDetails = orderData.paymentDetails !== undefined ? orderData.paymentDetails : billObj.paymentDetails;
      }

      try {
        billOutput = await bill.create(
          billObj,
          userData
        );
      } catch (err) {
        throw err;
      }
    }

    // -------------------------------------------------------
    // STEP 4: Update Order with Bill
    // -------------------------------------------------------

    if (billOutput) {
      await order.updateBillDetails(
        orderOutput._id,
        billOutput
      );
    }

    // -------------------------------------------------------
    // STEP 5: Table Session
    // -------------------------------------------------------

    if (
      orderData.tableRef &&
      orderData.status !==
      app.config.contentManagement.order.completed &&
      orderData.status !==
      app.config.contentManagement.order.deleted
    ) {
      let tableSessionOutput =
        await tableSession.getTableSessionByOrderId(orderOutput._id, userData.restaurantRef);

      if (!tableSessionOutput) {
        tableSessionOutput =
          await tableSession.createTableSessionFromOwnerOffline(
            orderData,
            userData
          );

        tableSessionOutput.orderRef =
          orderOutput._id;

        await tableSession.edit(
          tableSessionOutput
        );
      }

      await table.markAsUnavailable(
        orderData.tableRef,
        tableSessionOutput._id
      );
    }

    // -------------------------------------------------------
    // STEP 6: Inventory Operation
    // -------------------------------------------------------

    if (orderData.status === app.config.contentManagement.order.completed) {
      const inventoryOutput = await inventory.updateInventoryCount(
        orderData.cart,
        undefined,
        userData
      );

      await inventory.updateHistoryOrderRef(
        inventoryOutput.invIds,
        orderOutput._id
      ).catch(err => {
        console.log(
          "err updateHistoryOrderRef",
          err
        );
      });
    } else if (orderData.status === app.config.contentManagement.order.deleted) {
      if (orderData.noRevertBack) {
        const inventoryOutput = await inventory.updateInventoryCount(
          orderData.cart,
          undefined,
          userData
        );

        await inventory.updateHistoryOrderRef(
          inventoryOutput.invIds,
          orderOutput._id
        ).catch(err => {
          console.log(
            "err updateHistoryOrderRef",
            err
          );
        });
      }

    } else {
      const existingInventoryOperation =
        await inventory.findInventoryOperationByOrderId({
          orderRef: orderOutput._id,
          operationType: "CREATE"
        }, userData);

      if (!existingInventoryOperation) {
        try {
          await inventory.createInventoryOperation({
            restaurantRef:
              userData.restaurantRef,
            orderRef: orderOutput._id,
            userRef: userData._id,
            cart: orderData.cart,
            operationType: "CREATE"
          });
        } catch (err) {
          console.log(
            "err createInventoryOperation",
            err
          );
        }
      }
    }

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

    if (orderDataInput.status === app.config.contentManagement.order.completed) {
      await inventory.rollbackInventory(
        orderData._id,
        orderDataInput.cart,
        false,
        orderData.reOrderCount,
        userData
      );
    } else if (orderDataInput.status === app.config.contentManagement.order.deleted) {
      if (!orderDataInput.noRevertBack) {
        await inventory.rollbackInventory(
          orderData._id,
          orderDataInput.cart,
          true,
          orderData.reOrderCount,
          userData
        );
      } else {
        await inventory.rollbackInventory(
          orderData._id,
          orderDataInput.cart,
          false,
          orderData.reOrderCount,
          userData
        );
      }

    } else {
      await inventory.createInventoryOperation({
        restaurantRef: userData.restaurantRef,
        orderRef: orderData._id,
        userRef: userData._id,
        cart: orderDataInput.cart,
        oldCart: orderData.cart,
        operationType: "UPDATE"
      }).catch(err => {
        console.log("err updateInventoryOperation", err);
      });
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

    if (orderDataInput.updatedAt) {
      orderData.lastOfflineUpdatedAt = new Date(
        orderDataInput.updatedAt
      );
    }

    if (orderData.createdAt) {
      delete orderData.createdAt;
    }

    if (orderDataInput.status === app.config.contentManagement.order.deleted) {
      orderData.isRestoredWhileCancel = !orderDataInput.noRevertBack;
    }

    orderData.isOnline = false;

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

    if (orderDataInput.status === app.config.contentManagement.order.completed ||
      orderDataInput.status === app.config.contentManagement.order.deleted
    ) {
      billObj.isRoundOff = orderDataInput.isRoundOff !== undefined ? orderDataInput.isRoundOff : billObj.isRoundOff;
      billObj.isCGSTDisabled = orderDataInput.isCGSTDisabled !== undefined ? orderDataInput.isCGSTDisabled : billObj.isCGSTDisabled;
      billObj.isServiceTaxDisabled = orderDataInput.isServiceTaxDisabled !== undefined ? orderDataInput.isServiceTaxDisabled : billObj.isServiceTaxDisabled;
      billObj.isSGSTDisabled = orderDataInput.isSGSTDisabled !== undefined ? orderDataInput.isSGSTDisabled : billObj.isSGSTDisabled;
      billObj.discountDetails = orderDataInput.discountDetails !== undefined ? orderDataInput.discountDetails : billObj.discountDetails;
      billObj.paymentDetails = orderDataInput.paymentDetails !== undefined ? orderDataInput.paymentDetails : billObj.paymentDetails;
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
