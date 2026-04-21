export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain number' };
  }
  return { valid: true };
};

/**
 * Validate card creation data
 */
export const validateCard = (data: any): { valid: boolean; error?: string } => {
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    return { valid: false, error: 'Title is required and must be a non-empty string' };
  }

  if (!data.content_type || typeof data.content_type !== 'string' || data.content_type.trim().length === 0) {
    return { valid: false, error: 'Content type is required' };
  }

  // Validate content type
  const validTypes = ['social_link', 'pdf', 'docx', 'text', 'url', 'article'];
  if (!validTypes.includes(data.content_type)) {
    return { valid: false, error: `Content type must be one of: ${validTypes.join(', ')}` };
  }

  if (data.title.length > 500) {
    return { valid: false, error: 'Title must not exceed 500 characters' };
  }

  if (data.metadata && typeof data.metadata !== 'object') {
    return { valid: false, error: 'Metadata must be a JSON object' };
  }

  return { valid: true };
};

/**
 * Validate card update data
 */
export const validateCardUpdate = (data: any): { valid: boolean; error?: string } => {
  if (Object.keys(data).length === 0) {
    return { valid: false, error: 'At least one field must be provided for update' };
  }

  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      return { valid: false, error: 'Title must be a non-empty string' };
    }
    if (data.title.length > 500) {
      return { valid: false, error: 'Title must not exceed 500 characters' };
    }
  }

  if (data.content_type !== undefined) {
    return { valid: false, error: 'Content type cannot be updated' };
  }

  if (data.metadata !== undefined && typeof data.metadata !== 'object') {
    return { valid: false, error: 'Metadata must be a JSON object' };
  }

  return { valid: true };
};

/**
 * Validate tag name
 */
export const validateTagName = (name: any): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Tag name is required and must be a non-empty string' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Tag name must not exceed 100 characters' };
  }

  return { valid: true };
};

