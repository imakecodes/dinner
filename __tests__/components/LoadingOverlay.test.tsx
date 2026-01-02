import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LoadingOverlay } from '../../components/LoadingOverlay';

describe('LoadingOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should render nothing when isVisible is false', () => {
    const { container } = render(<LoadingOverlay isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render loading overlay when isVisible is true', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    expect(screen.getByText('Cooking up something special...')).toBeInTheDocument();
    expect(screen.getByText('Selecting the best ingredients...')).toBeInTheDocument();
    expect(screen.getByText('Please do not close your browser. This may take a moment.')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    const { container } = render(<LoadingOverlay isVisible={true} />);
    
    const overlayElement = container.querySelector('[role="status"]');
    expect(overlayElement).toBeInTheDocument();
    expect(overlayElement).toHaveAttribute('aria-live', 'polite');
    expect(overlayElement).toHaveAttribute('aria-busy', 'true');
  });

  it('should rotate through steps every 2500ms', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    // Initial step
    expect(screen.getByText('Selecting the best ingredients...')).toBeInTheDocument();
    
    // After 2500ms - should show step 2
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText('Consulting our AI Chef...')).toBeInTheDocument();
    
    // After another 2500ms - should show step 3
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText('Plating your dish...')).toBeInTheDocument();
    
    // After another 2500ms - should loop back to step 1
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText('Selecting the best ingredients...')).toBeInTheDocument();
  });

  it('should reset step to 0 when isVisible changes to false', () => {
    const { rerender } = render(<LoadingOverlay isVisible={true} />);
    
    // Advance to step 2
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText('Consulting our AI Chef...')).toBeInTheDocument();
    
    // Hide the overlay
    rerender(<LoadingOverlay isVisible={false} />);
    
    // Show it again - should be back at step 0
    rerender(<LoadingOverlay isVisible={true} />);
    expect(screen.getByText('Selecting the best ingredients...')).toBeInTheDocument();
  });

  it('should cleanup interval on unmount', () => {
    const { unmount } = render(<LoadingOverlay isVisible={true} />);
    
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should not start interval when isVisible is false', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    
    render(<LoadingOverlay isVisible={false} />);
    
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('should use translation keys correctly', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    // Check that all translation keys are being used
    expect(screen.getByText('Cooking up something special...')).toBeInTheDocument(); // loading.title
    expect(screen.getByText('Selecting the best ingredients...')).toBeInTheDocument(); // loading.step1
    expect(screen.getByText('Please do not close your browser. This may take a moment.')).toBeInTheDocument(); // loading.warning
  });

  it('should display chef hat icon', () => {
    const { container } = render(<LoadingOverlay isVisible={true} />);
    
    const chefIcon = container.querySelector('.fa-hat-chef');
    expect(chefIcon).toBeInTheDocument();
  });

  it('should display warning icon', () => {
    const { container } = render(<LoadingOverlay isVisible={true} />);
    
    const warningIcon = container.querySelector('.fa-exclamation-triangle');
    expect(warningIcon).toBeInTheDocument();
  });

  it('should have proper styling classes for animations', () => {
    const { container } = render(<LoadingOverlay isVisible={true} />);
    
    // Check that standard Tailwind animation classes are used
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
    
    const bounceElement = container.querySelector('.animate-bounce');
    expect(bounceElement).toBeInTheDocument();
    
    const pingElement = container.querySelector('.animate-ping');
    expect(pingElement).toBeInTheDocument();
  });

  it('should maintain step rotation when visible', async () => {
    render(<LoadingOverlay isVisible={true} />);
    
    // Verify it cycles through all 3 steps
    const steps = [
      'Selecting the best ingredients...',
      'Consulting our AI Chef...',
      'Plating your dish...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      expect(screen.getByText(steps[i])).toBeInTheDocument();
      act(() => {
        jest.advanceTimersByTime(2500);
      });
    }
    
    // Verify it loops back to the first step
    expect(screen.getByText(steps[0])).toBeInTheDocument();
  });
});
