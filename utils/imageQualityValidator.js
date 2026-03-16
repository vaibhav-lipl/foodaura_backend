const sharp = require('sharp');
const fs = require('fs');

/**
 * Check for motion blur by analyzing directional gradients
 * Motion blur creates directional streaks, detectable via gradient analysis
 * @param {Buffer} data - Image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Motion blur score (0-1, higher = more motion blur)
 */
const detectMotionBlur = (data, width, height) => {
  const gradients = [];
  
  // Calculate gradients in multiple directions
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Horizontal gradient (detects vertical motion blur)
      const hGrad = Math.abs(data[idx] - data[y * width + (x + 1)]);
      
      // Vertical gradient (detects horizontal motion blur)
      const vGrad = Math.abs(data[idx] - data[(y + 1) * width + x]);
      
      // Diagonal gradients
      const d1Grad = Math.abs(data[idx] - data[(y + 1) * width + (x + 1)]);
      const d2Grad = Math.abs(data[idx] - data[(y + 1) * width + (x - 1)]);
      
      // Motion blur creates strong directional patterns
      // If one direction dominates significantly, it's likely motion blur
      const maxGrad = Math.max(hGrad, vGrad, d1Grad, d2Grad);
      const avgGrad = (hGrad + vGrad + d1Grad + d2Grad) / 4;
      
      // High max-to-avg ratio indicates directional blur (motion)
      if (avgGrad > 0) {
        gradients.push(maxGrad / avgGrad);
      }
    }
  }
  
  if (gradients.length === 0) return 0;
  
  // Calculate how directional the blur is
  const directionalScore = gradients.reduce((sum, val) => sum + val, 0) / gradients.length;
  console.log(directionalScore);
  // Normalize to 0-1 scale (values > 2 indicate strong directional pattern)
  return Math.min(directionalScore / 3, 1);
};

/**
 * Check if image is blurry using variance of Laplacian method
 * Detects both Gaussian blur (out of focus) and motion blur
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<{isBlurry: boolean, variance: number, blurType?: string}>}
 */
const checkBlur = async (imagePath) => {
  try {
    // Resize image to a manageable size for faster processing (max 500px on longest side)
    // This also helps normalize variance calculation across different image sizes
    const metadata = await sharp(imagePath).metadata();
    const maxDimension = Math.max(metadata.width, metadata.height);
    const scale = maxDimension > 500 ? 500 / maxDimension : 1;
    
    // Read image, resize if needed, convert to grayscale
    const imageBuffer = await sharp(imagePath)
      .resize(Math.round(metadata.width * scale), Math.round(metadata.height * scale), {
        fit: 'inside',
        withoutEnlargement: true
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = imageBuffer;
    const width = info.width;
    const height = info.height;

    // Apply Laplacian kernel for edge detection
    // Laplacian kernel: [0, -1, 0; -1, 4, -1; 0, -1, 0]
    const laplacianValues = [];
    const laplacianSquaredValues = [];
    
    // Process all pixels for accuracy (no sampling)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const center = data[idx];
        const top = data[(y - 1) * width + x];
        const bottom = data[(y + 1) * width + x];
        const left = data[y * width + (x - 1)];
        const right = data[y * width + (x + 1)];
        
        // Laplacian operator: 4*center - (top + bottom + left + right)
        const laplacian = 4 * center - (top + bottom + left + right);
        
        // Store both original and squared values
        laplacianValues.push(laplacian);
        laplacianSquaredValues.push(laplacian * laplacian);
      }
    }

    if (laplacianValues.length === 0) {
      throw new Error('Unable to process image for blur detection');
    }

    // Calculate variance of Laplacian (not squared)
    // This is the correct Laplacian variance method
    const mean = laplacianValues.reduce((sum, val) => sum + val, 0) / laplacianValues.length;
    const variance = laplacianValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / laplacianValues.length;
    
    // Additional check: count strong edges (high absolute Laplacian values)
    // Blurry images have fewer strong edges
    // Use absolute values for edge detection
    const absLaplacianValues = laplacianValues.map(val => Math.abs(val));
    const meanAbs = absLaplacianValues.reduce((sum, val) => sum + val, 0) / absLaplacianValues.length;
    const edgeThreshold = meanAbs * 2; // Strong edges are 2x the mean
    const strongEdges = absLaplacianValues.filter(val => val > edgeThreshold).length;
    const edgeRatio = strongEdges / absLaplacianValues.length;
    
    // Hard bypass: definitely sharp images (variance > 800)
    // Very sharp images should always pass regardless of other checks
    if (variance > 800) {
      return {
        isBlurry: false,
        variance: Math.round(variance * 100) / 100,
        blurType: undefined
      };
    }
    
    // Check for motion blur specifically
    const motionBlurScore = detectMotionBlur(data, width, height);
    
    // Threshold: variance < 100 indicates blurry image (Gaussian blur / out of focus)
    // For very blurry images, variance will be much lower (often < 30-50)
    // For sharp images, variance is typically > 200-500
    // Also check edge ratio - blurry images have < 5% strong edges
    
    const hasGaussianBlur = variance < 100 || (variance < 150 && edgeRatio < 0.05);
    
    // Motion blur only matters for low–mid sharpness images
    // Don't penalize sharp images (variance > 500) for motion blur
    const hasMotionBlur = variance < 500 && motionBlurScore > 0.4;
    
    const isBlurry = hasGaussianBlur || hasMotionBlur;
    
    // Determine blur type for logging/debugging
    let blurType = null;
    if (isBlurry) {
      if (hasMotionBlur && hasGaussianBlur) {
        blurType = 'both';
      } else if (hasMotionBlur) {
        blurType = 'motion';
      } else {
        blurType = 'gaussian';
      }
    }
    
    console.log('Blur Detection:', {
      variance: Math.round(variance * 100) / 100,
      edgeRatio: Math.round(edgeRatio * 10000) / 100 + '%',
      motionBlurScore: Math.round(motionBlurScore * 100) / 100,
      isBlurry,
      blurType
    });
    
    return {
      isBlurry,
      variance: Math.round(variance * 100) / 100,
      blurType: blurType || undefined
    };
  } catch (error) {
    throw new Error(`Blur detection failed: ${error.message}`);
  }
};

/**
 * Check if image is too dark by calculating average brightness
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<{isTooDark: boolean, brightness: number}>}
 */
const checkBrightness = async (imagePath) => {
  try {
    // Get image statistics using sharp
    // Convert to grayscale and get stats
    const stats = await sharp(imagePath)
      .greyscale()
      .stats();
    
    // Calculate average brightness from channel mean
    // For grayscale, we use the mean of the single channel
    const brightness = stats.channels[0].mean;
    
    // Threshold: brightness < 50 indicates too dark
    const isTooDark = brightness < 50;
    
    return {
      isTooDark,
      brightness: Math.round(brightness * 100) / 100
    };
  } catch (error) {
    throw new Error(`Brightness check failed: ${error.message}`);
  }
};

/**
 * Check if image has low contrast (unclear or dirty)
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<{isUnclear: boolean, contrast: number}>}
 */
const checkContrast = async (imagePath) => {
  try {
    // Get image statistics using sharp
    // Convert to grayscale and get stats
    const stats = await sharp(imagePath)
      .greyscale()
      .stats();
    
    // Calculate contrast using standard deviation
    // Standard deviation represents contrast - higher values mean more contrast
    const contrast = stats.channels[0].stdev;
    
    // Threshold: contrast < 20 indicates unclear or dirty image
    const isUnclear = contrast < 20;
    
    return {
      isUnclear,
      contrast: Math.round(contrast * 100) / 100
    };
  } catch (error) {
    throw new Error(`Contrast check failed: ${error.message}`);
  }
};

/**
 * Validate image quality by running all checks sequentially
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<{valid: boolean, error?: string, details?: object}>}
 */
const validateImageQuality = async (imagePath) => {
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    return {
      valid: false,
      error: 'Image file not found'
    };
  }

  try {
    // 1. Check for blur
    const blurResult = await checkBlur(imagePath);
    if (blurResult.isBlurry) {
      return {
        valid: false,
        error: 'Image is blurry. Please upload a clear image so food items are easily visible.',
        details: {
          type: 'blur',
          variance: blurResult.variance
        }
      };
    }

    // 2. Check brightness
    const brightnessResult = await checkBrightness(imagePath);
    if (brightnessResult.isTooDark) {
      return {
        valid: false,
        error: 'Image is too dark. Please upload a well-lit image.',
        details: {
          type: 'brightness',
          brightness: brightnessResult.brightness
        }
      };
    }

    // 3. Check contrast
    const contrastResult = await checkContrast(imagePath);
    if (contrastResult.isUnclear) {
      return {
        valid: false,
        error: 'Image is unclear or dirty. Please clean the camera lens and try again.',
        details: {
          type: 'contrast',
          contrast: contrastResult.contrast
        }
      };
    }

    // All validations passed
    return {
      valid: true,
      details: {
        blur: {
          variance: blurResult.variance,
          status: 'clear'
        },
        brightness: {
          value: brightnessResult.brightness,
          status: 'adequate'
        },
        contrast: {
          value: contrastResult.contrast,
          status: 'clear'
        }
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: `Image validation failed: ${error.message}`
    };
  }
};

module.exports = {
  checkBlur,
  checkBrightness,
  checkContrast,
  validateImageQuality
};


