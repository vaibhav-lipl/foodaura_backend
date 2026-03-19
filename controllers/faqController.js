const { FAQ, FAQModule } = require('../models');

const VALID_USER_TYPES = ['customer', 'delivery_partner'];

const normalizeModuleName = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
};

const buildSlug = (value) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const serializeModule = (module) => ({
  id: module.id,
  name: module.name,
  slug: module.slug,
  createdAt: module.createdAt,
  updatedAt: module.updatedAt
});

const serializeFAQ = (faq) => ({
  id: faq.id,
  moduleId: faq.moduleId,
  module: faq.faqModule ? faq.faqModule.name : null,
  module_data: faq.faqModule ? serializeModule(faq.faqModule) : null,
  user_type: faq.userType,
  question: faq.question,
  answer: faq.answer,
  createdAt: faq.createdAt,
  updatedAt: faq.updatedAt
});

const findModuleByIdentifier = async ({ moduleId, moduleName }) => {
  if (moduleId) {
    return FAQModule.findByPk(moduleId);
  }

  if (moduleName) {
    return FAQModule.findOne({
      where: {
        slug: buildSlug(moduleName)
      }
    });
  }

  return null;
};

const getOrCreateModule = async ({ moduleId, moduleName }) => {
  const normalizedModuleName = normalizeModuleName(moduleName);

  if (moduleId) {
    const module = await FAQModule.findByPk(moduleId);
    if (!module) {
      return { error: 'Selected FAQ module does not exist' };
    }
    return { module };
  }

  if (!normalizedModuleName) {
    return { error: 'moduleId or module is required' };
  }

  const slug = buildSlug(normalizedModuleName);
  if (!slug) {
    return { error: 'Valid module name is required' };
  }

  const existingModule = await FAQModule.findOne({ where: { slug } });
  if (existingModule) {
    return { module: existingModule };
  }

  const module = await FAQModule.create({
    name: normalizedModuleName,
    slug
  });

  return { module };
};

exports.getFAQModules = async (req, res) => {
  try {
    const modules = await FAQModule.findAll({
      order: [['name', 'ASC']]
    });

    return res.json({
      success: true,
      data: modules.map(serializeModule)
    });
  } catch (error) {
    console.error('Get FAQ Modules Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ modules'
    });
  }
};

exports.createFAQModule = async (req, res) => {
  try {
    const name = normalizeModuleName(req.body.name);
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Module name is required'
      });
    }

    const slug = buildSlug(name);
    const existingModule = await FAQModule.findOne({ where: { slug } });
    if (existingModule) {
      return res.status(409).json({
        success: false,
        message: 'FAQ module already exists'
      });
    }

    const module = await FAQModule.create({ name, slug });

    return res.status(201).json({
      success: true,
      message: 'FAQ module created successfully',
      data: serializeModule(module)
    });
  } catch (error) {
    console.error('Create FAQ Module Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create FAQ module'
    });
  }
};

exports.updateFAQModule = async (req, res) => {
  try {
    const module = await FAQModule.findByPk(req.params.id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'FAQ module not found'
      });
    }

    const name = normalizeModuleName(req.body.name);
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Module name is required'
      });
    }

    const slug = buildSlug(name);
    const duplicateModule = await FAQModule.findOne({ where: { slug } });
    if (duplicateModule && duplicateModule.id !== module.id) {
      return res.status(409).json({
        success: false,
        message: 'FAQ module already exists'
      });
    }

    await module.update({ name, slug });

    return res.json({
      success: true,
      message: 'FAQ module updated successfully',
      data: serializeModule(module)
    });
  } catch (error) {
    console.error('Update FAQ Module Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update FAQ module'
    });
  }
};

exports.deleteFAQModule = async (req, res) => {
  try {
    const module = await FAQModule.findByPk(req.params.id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'FAQ module not found'
      });
    }

    const faqCount = await FAQ.count({ where: { moduleId: module.id } });
    if (faqCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete module with existing FAQs'
      });
    }

    await module.destroy();

    return res.json({
      success: true,
      message: 'FAQ module deleted successfully'
    });
  } catch (error) {
    console.error('Delete FAQ Module Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ module'
    });
  }
};

exports.getAdminFAQs = async (req, res) => {
  try {
    const { user_type: userType, moduleId, module: moduleName } = req.query;
    const where = {};

    if (userType) {
      if (!VALID_USER_TYPES.includes(userType)) {
        return res.status(400).json({
          success: false,
          message: 'user_type must be customer or delivery_partner'
        });
      }
      where.userType = userType;
    }

    if (moduleId || moduleName) {
      const module = await findModuleByIdentifier({ moduleId, moduleName });
      if (module) {
        where.moduleId = module.id;
      } else if (moduleId || moduleName) {
        return res.json({
          success: true,
          data: []
        });
      }
    }

    const faqs = await FAQ.findAll({
      where,
      include: [{
        model: FAQModule,
        as: 'faqModule'
      }],
      order: [
        [{ model: FAQModule, as: 'faqModule' }, 'name', 'ASC'],
        ['id', 'DESC']
      ]
    });

    return res.json({
      success: true,
      data: faqs.map(serializeFAQ)
    });
  } catch (error) {
    console.error('Get Admin FAQs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs'
    });
  }
};

exports.createFAQ = async (req, res) => {
  try {
    const userType = req.body.user_type;
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
    const answer = typeof req.body.answer === 'string' ? req.body.answer.trim() : '';

    if (!VALID_USER_TYPES.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'user_type must be customer or delivery_partner'
      });
    }

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'question and answer are required'
      });
    }

    const { module, error } = await getOrCreateModule({
      moduleId: req.body.moduleId,
      moduleName: req.body.module
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    const faq = await FAQ.create({
      moduleId: module.id,
      userType,
      question,
      answer
    });

    const createdFaq = await FAQ.findByPk(faq.id, {
      include: [{
        model: FAQModule,
        as: 'faqModule'
      }]
    });

    return res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: serializeFAQ(createdFaq)
    });
  } catch (error) {
    console.error('Create FAQ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create FAQ'
    });
  }
};

exports.updateFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByPk(req.params.id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    const updates = {};

    if (req.body.user_type !== undefined) {
      if (!VALID_USER_TYPES.includes(req.body.user_type)) {
        return res.status(400).json({
          success: false,
          message: 'user_type must be customer or delivery_partner'
        });
      }
      updates.userType = req.body.user_type;
    }

    if (req.body.question !== undefined) {
      const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
      if (!question) {
        return res.status(400).json({
          success: false,
          message: 'question cannot be empty'
        });
      }
      updates.question = question;
    }

    if (req.body.answer !== undefined) {
      const answer = typeof req.body.answer === 'string' ? req.body.answer.trim() : '';
      if (!answer) {
        return res.status(400).json({
          success: false,
          message: 'answer cannot be empty'
        });
      }
      updates.answer = answer;
    }

    if (req.body.moduleId !== undefined || req.body.module !== undefined) {
      const { module, error } = await getOrCreateModule({
        moduleId: req.body.moduleId,
        moduleName: req.body.module
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: error
        });
      }

      updates.moduleId = module.id;
    }

    await faq.update(updates);

    const updatedFaq = await FAQ.findByPk(faq.id, {
      include: [{
        model: FAQModule,
        as: 'faqModule'
      }]
    });

    return res.json({
      success: true,
      message: 'FAQ updated successfully',
      data: serializeFAQ(updatedFaq)
    });
  } catch (error) {
    console.error('Update FAQ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update FAQ'
    });
  }
};

exports.deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByPk(req.params.id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    await faq.destroy();

    return res.json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    console.error('Delete FAQ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ'
    });
  }
};

const getFAQsByUserType = async (req, res, userType) => {
  const { moduleId, module: moduleName } = req.query;
  const where = { userType };

  if (moduleId || moduleName) {
    const module = await findModuleByIdentifier({ moduleId, moduleName });
    if (!module) {
      return res.json({
        success: true,
        data: []
      });
    }
    where.moduleId = module.id;
  }

  const faqs = await FAQ.findAll({
    where,
    include: [{
      model: FAQModule,
      as: 'faqModule'
    }],
    order: [
      [{ model: FAQModule, as: 'faqModule' }, 'name', 'ASC'],
      ['id', 'DESC']
    ]
  });

  return res.json({
    success: true,
    data: faqs.map(serializeFAQ)
  });
};

exports.getCustomerFAQs = async (req, res) => {
  try {
    return await getFAQsByUserType(req, res, 'customer');
  } catch (error) {
    console.error('Get Customer FAQs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer FAQs'
    });
  }
};

exports.getDeliveryPartnerFAQs = async (req, res) => {
  try {
    return await getFAQsByUserType(req, res, 'delivery_partner');
  } catch (error) {
    console.error('Get Delivery Partner FAQs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery partner FAQs'
    });
  }
};
