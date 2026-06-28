'use strict';

const cron = require('node-cron');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const bulkUpload = async (app) => {
  // console.log('bulk upload cron job started');
  const TempRestaurant = app.models.TempRestaurant;
  const uploadDir = path.join(__dirname, 'public', 'uploads', 'unregistered-restaurant-excel');
  // const uploadDir = path.join(__dirname, '../../../../public/uploads/unregistered-restaurant-excel');
  // console.log('uploads directory', uploadDir);
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);

    if (files && files.length) {
      // console.log('files found in uploads directory', files);
      const excelFiles = files.filter((file) => file.endsWith('.xlsx') || file.endsWith('.xls'));
      // console.log('excel files found in uploads directory', excelFiles);
      if (excelFiles && excelFiles.length) {
        for (const file of excelFiles) {
          // console.log('file found in uploads directory', file);
          const filePath = path.join(uploadDir, file);
          // console.log('file path', filePath);
          if (filePath) {

            try {
              const workbook = xlsx.readFile(filePath);

              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const rows = xlsx.utils.sheet_to_json(worksheet);

              const data = rows.map((row) => {
                const number = app.utility.parseMobile(row['phone']);
                if (number) {
                  return {
                    name: row['name'] || '',
                    phone: {
                      countryCode: 'IN',
                      number
                    }
                  };
                } else {
                  return null;
                }
              }).filter((item) => !!item);



              // console.log("completed ", data);

              const insertedDocs = await TempRestaurant.insertMany(data, { ordered: false });
              // remove the file after uploading
              if (filePath) {
                fs.unlinkSync(filePath);
              }
              // console.log('Bulk upload completed successfully! ');
            } catch (err) {
              console.log('Error in bulk upload ', JSON.stringify(err));
            }
          }
        }
      }
    }
  } else {
    console.warn(`Upload directory not found: ${uploadDir}`);
  }
};

module.exports = function (app) {
  // cron will run every 1 hour, for testing make 0 as * for minute
  cron.schedule('* * * * *', () => {
    console.log('cron will run every minute');
    bulkUpload(app);
  });
};
