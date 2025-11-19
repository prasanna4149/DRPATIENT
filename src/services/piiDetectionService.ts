/**
 * PII Detection Service
 * 
 * This service handles communication with the backend PII detection API
 * and provides methods for detecting and masking personally identifiable information.
 */

export interface PIIDetectionRequest {
  text: string;
  user_id?: string;
  sensitivity?: 'low' | 'medium' | 'high';
}

export interface PIIViolation {
  type: string;
  pattern: string;
}

export interface PIIDetectionResponse {
  is_blocked: boolean;
  confidence: 'low' | 'medium' | 'high';
  violation_type: string | null;
  detected_pattern: string | null;
  original_text: string;
  normalized_text: string;
  severity_score: number;
  all_violations: PIIViolation[];
  masked_text: string;
  detection_threshold_met: boolean;
  processing_time_ms: number;
}

export interface PIIStats {
  system_info: {
    sensitivity: string;
    patterns_loaded: number;
    version: string;
  };
  rate_limiting: {
    window_minutes: number;
    max_violations: number;
  };
}

export interface UserViolations {
  user_id: string;
  violation_count: number;
  is_rate_limited: boolean;
  window_minutes: number;
}

const DEFAULT_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

class PIIDetectionService {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = DEFAULT_BASE_URL, timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Detect PII in text
   */
  async detectPII(request: PIIDetectionRequest): Promise<PIIDetectionResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/pii/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('PII detection request timed out');
        }
        throw new Error(`PII detection failed: ${error.message}`);
      }
      throw new Error('PII detection failed: Unknown error');
    }
  }

  /**
   * Check if text should be blocked based on PII detection
   */
  async shouldBlockMessage(text: string, userId?: string, sensitivity: 'low' | 'medium' | 'high' = 'high'): Promise<{
    shouldBlock: boolean;
    reason: string;
    maskedText: string;
    confidence: string;
    violations: PIIViolation[];
  }> {
    try {
      const result = await this.detectPII({
        text,
        user_id: userId,
        sensitivity
      });

      return {
        shouldBlock: result.is_blocked || result.detection_threshold_met,
        reason: result.violation_type || 'PII detected',
        maskedText: result.masked_text,
        confidence: result.confidence,
        violations: result.all_violations
      };
    } catch (error) {
      console.error('Error checking message blocking:', error);
      // In case of error, allow the message but log the issue
      return {
        shouldBlock: false,
        reason: 'Error during PII detection',
        maskedText: text,
        confidence: 'low',
        violations: []
      };
    }
  }

  /**
   * Mask PII in text without blocking
   */
  async maskPII(text: string, userId?: string, sensitivity: 'low' | 'medium' | 'high' = 'high'): Promise<{
    maskedText: string;
    hasPII: boolean;
    violations: PIIViolation[];
  }> {
    try {
      const result = await this.detectPII({
        text,
        user_id: userId,
        sensitivity
      });

      return {
        maskedText: result.masked_text,
        hasPII: result.all_violations.length > 0,
        violations: result.all_violations
      };
    } catch (error) {
      console.error('Error masking PII:', error);
      return {
        maskedText: text,
        hasPII: false,
        violations: []
      };
    }
  }

  /**
   * Get system statistics
   */
  async getStats(): Promise<PIIStats> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/pii/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get PII stats: ${error.message}`);
      }
      throw new Error('Failed to get PII stats: Unknown error');
    }
  }

  /**
   * Get user violation information
   */
  async getUserViolations(userId: string): Promise<UserViolations> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/pii/user-violations/${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get user violations: ${error.message}`);
      }
      throw new Error('Failed to get user violations: Unknown error');
    }
  }

  /**
   * Check if the PII detection service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Shorter timeout for health check

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('PII detection service health check failed:', error);
      return false;
    }
  }

  /**
   * Set the base URL for the service
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the timeout for requests
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}

// Create and export a singleton instance
export const piiDetectionService = new PIIDetectionService();

// Export the class for custom instances
export default PIIDetectionService;
