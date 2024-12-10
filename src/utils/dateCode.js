import { Barcode } from "../models/barcode.model.js";

const getOrCreateDateCode = async (date) => {
  // Check if document exists for the provided date
  let dateCodeDoc = await Barcode.findOne({ date });
  if (dateCodeDoc) {
    return dateCodeDoc;
  }

  // Generate a new random 4-digit code
  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();

  // Create a new document with the current date and generated code
  dateCodeDoc = new Barcode({ date, code: randomCode });
  await dateCodeDoc.save();

  return dateCodeDoc;
};

export { getOrCreateDateCode };
