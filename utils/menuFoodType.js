const MENU_FOOD_TYPES = ['veg', 'nonVeg', 'jain'];

const normalizeMenuFoodType = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return MENU_FOOD_TYPES.includes(normalizedValue) ? normalizedValue : null;
};

const normalizeRestaurantFoodTypeFilter = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === 'non-veg') {
    return 'non-veg';
  }

  if (normalizedValue === 'nonveg') {
    return 'non-veg';
  }

  if (normalizedValue === 'veg' || normalizedValue === 'jain') {
    return normalizedValue;
  }

  return null;
};

const normalizeLegacyIsVeg = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (['true', '1'].includes(normalizedValue)) {
      return true;
    }

    if (['false', '0'].includes(normalizedValue)) {
      return false;
    }
  }

  return undefined;
};

const foodTypeToLegacyIsVeg = (foodType) => {
  const normalizedFoodType = normalizeMenuFoodType(foodType);

  if (!normalizedFoodType) {
    return undefined;
  }

  return normalizedFoodType !== 'nonVeg';
};

const legacyIsVegToFoodType = (isVeg) => {
  const normalizedIsVeg = normalizeLegacyIsVeg(isVeg);

  if (normalizedIsVeg === undefined) {
    return null;
  }

  return normalizedIsVeg ? 'veg' : 'nonVeg';
};

const getResolvedFoodType = (foodType, isVeg, fallbackFoodType = null, fallbackIsVeg = undefined) => {
  const normalizedFoodType = normalizeMenuFoodType(foodType);
  if (normalizedFoodType) {
    return normalizedFoodType;
  }

  const normalizedLegacyFoodType = legacyIsVegToFoodType(isVeg);
  if (normalizedLegacyFoodType) {
    return normalizedLegacyFoodType;
  }

  const normalizedFallbackFoodType = normalizeMenuFoodType(fallbackFoodType);
  if (normalizedFallbackFoodType) {
    return normalizedFallbackFoodType;
  }

  return legacyIsVegToFoodType(fallbackIsVeg);
};

const getMenuDietFields = (input = {}, fallback = {}, options = {}) => {
  const hasFoodTypeInput = input.foodType !== undefined && input.foodType !== null && input.foodType !== '';
  const hasIsVegInput = input.isVeg !== undefined && input.isVeg !== null && input.isVeg !== '';

  let foodType = getResolvedFoodType(
    input.foodType,
    input.isVeg,
    fallback.foodType,
    fallback.isVeg
  );

  if (!foodType && options.defaultToVeg) {
    foodType = 'veg';
  }

  if (!foodType && !hasFoodTypeInput && !hasIsVegInput) {
    return null;
  }

  if (!foodType) {
    return null;
  }

  return {
    foodType,
    isVeg: foodTypeToLegacyIsVeg(foodType)
  };
};

const getRestaurantVegStatusFromMenus = (menus = []) => {
  let hasNonVegMenu = false;
  let hasAnyKnownFoodType = false;

  menus.forEach((menu) => {
    const foodType = getResolvedFoodType(menu.foodType, menu.isVeg);

    if (!foodType) {
      return;
    }

    hasAnyKnownFoodType = true;

    if (foodType === 'nonVeg') {
      hasNonVegMenu = true;
    }
  });

  if (!hasAnyKnownFoodType) {
    return false;
  }

  return !hasNonVegMenu;
};

const getRestaurantFoodTypesFromMenus = (menus = []) => {
  const orderedTypes = [];
  const seenTypes = new Set();

  menus.forEach((menu) => {
    const foodType = getResolvedFoodType(menu.foodType, menu.isVeg);

    if (!foodType || seenTypes.has(foodType)) {
      return;
    }

    seenTypes.add(foodType);
    orderedTypes.push(foodType);
  });

  return orderedTypes.map((foodType) => {
    if (foodType === 'nonVeg') {
      return 'non-veg';
    }

    return foodType;
  });
};

module.exports = {
  MENU_FOOD_TYPES,
  normalizeMenuFoodType,
  normalizeRestaurantFoodTypeFilter,
  normalizeLegacyIsVeg,
  foodTypeToLegacyIsVeg,
  legacyIsVegToFoodType,
  getResolvedFoodType,
  getMenuDietFields,
  getRestaurantVegStatusFromMenus,
  getRestaurantFoodTypesFromMenus
};
