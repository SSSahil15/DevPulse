/**
 * MetricCard.test.jsx
 * ===================
 * Tests for MetricCard — covers all tone variants and the
 * conditional "/ 100" suffix shown on numeric risk values.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricCard from '../MetricCard';

describe('MetricCard — rendering', () => {
  it('renders the eyebrow label', () => {
    render(<MetricCard eyebrow="Build Rate" value="98%" detail="Success rate" />);
    expect(screen.getByText('Build Rate')).toBeInTheDocument();
  });

  it('renders the value', () => {
    render(<MetricCard eyebrow="Score" value="85" detail="DevPulse score" />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('renders the detail text in the tooltip', () => {
    render(<MetricCard eyebrow="Score" value="85" detail="Composite DevPulse score" />);
    expect(screen.getByText('Composite DevPulse score')).toBeInTheDocument();
  });
});

describe('MetricCard — tone variants', () => {
  it('renders without error for danger tone', () => {
    render(<MetricCard eyebrow="Risk Score" value={75} detail="Risk" tone="danger" />);
    expect(screen.getByText('Risk Score')).toBeInTheDocument();
  });

  it('renders without error for warning tone', () => {
    render(<MetricCard eyebrow="Issues" value={12} detail="Open issues" tone="warning" />);
    expect(screen.getByText('Issues')).toBeInTheDocument();
  });

  it('renders without error for success tone', () => {
    render(<MetricCard eyebrow="Tests" value="100%" detail="Pass rate" tone="success" />);
    expect(screen.getByText('Tests')).toBeInTheDocument();
  });

  it('renders without error for neutral tone (default)', () => {
    render(<MetricCard eyebrow="Stars" value={42} detail="GitHub stars" />);
    expect(screen.getByText('Stars')).toBeInTheDocument();
  });

  it('falls back to neutral tone for unknown tone value', () => {
    render(<MetricCard eyebrow="X" value="?" detail="Unknown" tone="xyz" />);
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});

describe('MetricCard — conditional "/ 100" suffix', () => {
  it('shows "/ 100" suffix when value is a number AND eyebrow contains "risk"', () => {
    render(<MetricCard eyebrow="Risk Score" value={42} detail="Risk level" />);
    expect(screen.getByText('/ 100')).toBeInTheDocument();
  });

  it('does NOT show "/ 100" suffix when value is a string', () => {
    render(<MetricCard eyebrow="Risk Score" value="42" detail="Risk level" />);
    expect(screen.queryByText('/ 100')).not.toBeInTheDocument();
  });

  it('does NOT show "/ 100" suffix when eyebrow does not contain "risk"', () => {
    render(<MetricCard eyebrow="Score" value={42} detail="Score" />);
    expect(screen.queryByText('/ 100')).not.toBeInTheDocument();
  });
});
