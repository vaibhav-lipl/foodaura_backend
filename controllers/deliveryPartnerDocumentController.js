const { DeliveryPartnerDocument } = require('../models');
const { getImageUrl } = require('../middleware/upload');

// Helper to get document URL
const getDocumentUrl = (req, filename) => {
  if (!filename) return null;
  const baseUrl = req.protocol + '://' + req.get('host');
  const justFilename = filename.includes('/') ? filename.split('/').pop() : filename;
  return `${baseUrl}/uploads/documents/${justFilename}`;
};

/**
 * @desc    Get Documents
 * @route   GET /api/captain/documents
 * @access  Private
 */
exports.getDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const documents = await DeliveryPartnerDocument.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    const documentsData = documents.map(doc => ({
      id: doc.id,
      type: doc.type,
      name: doc.name,
      url: getDocumentUrl(req, doc.url),
      status: doc.status,
      uploadDate: doc.uploadDate,
      expiryDate: doc.expiryDate
    }));

    res.json({
      success: true,
      documents: documentsData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload Document
 * @route   POST /api/captain/documents
 * @access  Private
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, expiryDate } = req.body;

    if (!type || !req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Document type and file are required'
        }
      });
    }

    const validTypes = ['drivingLicense', 'vehicleRegistration', 'insurance', 'idProof'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid document type'
        }
      });
    }

    const documentNames = {
      drivingLicense: 'Driving License',
      vehicleRegistration: 'Vehicle Registration',
      insurance: 'Insurance Certificate',
      idProof: 'ID Proof'
    };

    // Check if document of this type already exists
    const existingDoc = await DeliveryPartnerDocument.findOne({
      where: { userId, type }
    });

    let document;
    if (existingDoc) {
      // Update existing document
      await existingDoc.update({
        url: req.file.filename,
        expiryDate: expiryDate || null,
        status: 'pending',
        uploadDate: new Date()
      });
      document = existingDoc;
    } else {
      // Create new document
      document = await DeliveryPartnerDocument.create({
        userId,
        type,
        name: documentNames[type],
        url: req.file.filename,
        expiryDate: expiryDate || null,
        status: 'pending'
      });
    }

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        type: document.type,
        url: getDocumentUrl(req, document.url),
        status: document.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Document
 * @route   PUT /api/captain/documents/:documentId
 * @access  Private
 */
exports.updateDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { documentId } = req.params;
    const { expiryDate } = req.body;

    const document = await DeliveryPartnerDocument.findOne({
      where: { id: documentId, userId }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found'
        }
      });
    }

    const updateData = {};
    if (req.file) {
      updateData.url = req.file.filename;
      updateData.status = 'pending';
      updateData.uploadDate = new Date();
    }
    if (expiryDate) {
      updateData.expiryDate = expiryDate;
    }

    await document.update(updateData);

    res.json({
      success: true,
      message: 'Document updated successfully',
      document: {
        id: document.id,
        type: document.type,
        url: getDocumentUrl(req, document.url),
        status: document.status
      }
    });
  } catch (error) {
    next(error);
  }
};

