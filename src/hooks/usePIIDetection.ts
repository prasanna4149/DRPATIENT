/**
 * PII Detection Hook
 * 
 * React hook for integrating PII detection into components
 */

import { useState, useCallback, useEffect } from 'react';
import { piiDetectionService, PIIDetectionResponse, PIIViolation } from '../services/piiDetectionService';

export interface PIIDetectionState {
  isLoading: boolean;
  isServiceHealthy: boolean;
  lastError: string | null;
}

export interface PIICheckResult {
  shouldBlock: boolean;
  reason: string;
  maskedText: string;
  confidence: string;
  violations: PIIViolation[];
  processingTime?: number;
}

export const usePIIDetection = (userId?: string, sensitivity: 'low' | 'medium' | 'high' = 'high') => {
  const [state, setState] = useState<PIIDetectionState>({
    isLoading: false,
    isServiceHealthy: false,
    lastError: null,
  });

  // Check service health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const isHealthy = await piiDetectionService.healthCheck();
        setState(prev => ({ ...prev, isServiceHealthy: isHealthy }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isServiceHealthy: false,
          lastError: 'Failed to connect to PII detection service'
        }));
      }
    };

    checkHealth();
    
    // Check health periodically
    const healthCheckInterval = setInterval(checkHealth, 30000); // Every 30 seconds
    
    return () => clearInterval(healthCheckInterval);
  }, []);

  /**
   * Check if a message should be blocked due to PII
   */
  const checkMessage = useCallback(async (text: string): Promise<PIICheckResult> => {
    if (!text.trim()) {
      return {
        shouldBlock: false,
        reason: 'Empty message',
        maskedText: text,
        confidence: 'low',
        violations: []
      };
    }

    setState(prev => ({ ...prev, isLoading: true, lastError: null }));

    try {
      const startTime = Date.now();
      const result = await piiDetectionService.shouldBlockMessage(text, userId, sensitivity);
      const processingTime = Date.now() - startTime;

      setState(prev => ({ ...prev, isLoading: false }));

      return {
        ...result,
        processingTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastError: errorMessage,
        isServiceHealthy: false
      }));

      // Return safe defaults on error
      return {
        shouldBlock: false,
        reason: 'Error during PII detection',
        maskedText: text,
        confidence: 'low',
        violations: []
      };
    }
  }, [userId, sensitivity]);

  /**
   * Mask PII in text without blocking
   */
  const maskPII = useCallback(async (text: string): Promise<{
    maskedText: string;
    hasPII: boolean;
    violations: PIIViolation[];
  }> => {
    if (!text.trim()) {
      return {
        maskedText: text,
        hasPII: false,
        violations: []
      };
    }

    setState(prev => ({ ...prev, isLoading: true, lastError: null }));

    try {
      const result = await piiDetectionService.maskPII(text, userId, sensitivity);
      setState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastError: errorMessage,
        isServiceHealthy: false
      }));

      return {
        maskedText: text,
        hasPII: false,
        violations: []
      };
    }
  }, [userId, sensitivity]);

  /**
   * Get detailed PII detection results
   */
  const detectPII = useCallback(async (text: string): Promise<PIIDetectionResponse | null> => {
    if (!text.trim()) {
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, lastError: null }));

    try {
      const result = await piiDetectionService.detectPII({
        text,
        user_id: userId,
        sensitivity
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastError: errorMessage,
        isServiceHealthy: false
      }));
      return null;
    }
  }, [userId, sensitivity]);

  /**
   * Clear the last error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }));
  }, []);

  /**
   * Retry service connection
   */
  const retryConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    
    try {
      const isHealthy = await piiDetectionService.healthCheck();
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isServiceHealthy: isHealthy,
        lastError: isHealthy ? null : 'Service is not responding'
      }));
      return isHealthy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isServiceHealthy: false,
        lastError: errorMessage
      }));
      return false;
    }
  }, []);

  return {
    // State
    ...state,
    
    // Methods
    checkMessage,
    maskPII,
    detectPII,
    clearError,
    retryConnection,
    
    // Utility
    isReady: state.isServiceHealthy && !state.isLoading,
  };
};

export default usePIIDetection;
