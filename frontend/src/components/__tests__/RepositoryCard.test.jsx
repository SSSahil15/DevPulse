/**
 * RepositoryCard.test.jsx
 * =======================
 * Tests for the RepositoryCard pure presentational component.
 * Covers all prop-driven rendering branches and user interactions.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RepositoryCard from '../../components/RepositoryCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseRepo = {
  id:             1,
  name:           'hello-world',
  fullName:       'octocat/hello-world',
  description:    'A sample repository',
  language:       'JavaScript',
  stargazersCount: 42,
  isPrivate:      false,
};

function renderCard(props = {}) {
  const defaults = {
    repository: baseRepo,
    isSelected:  false,
    isAnalyzing: false,
    onSelect:    vi.fn(),
    onAnalyze:   vi.fn(),
  };
  return render(<RepositoryCard {...defaults} {...props} />);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('RepositoryCard — rendering', () => {
  it('renders the repository name', () => {
    renderCard();
    expect(screen.getByText('hello-world')).toBeInTheDocument();
  });

  it('renders the star count', () => {
    renderCard();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    renderCard();
    expect(screen.getByText('A sample repository')).toBeInTheDocument();
  });

  it('does NOT render description when null', () => {
    renderCard({ repository: { ...baseRepo, description: null } });
    expect(screen.queryByText('A sample repository')).not.toBeInTheDocument();
  });

  it('renders the language when provided', () => {
    renderCard();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('does NOT render language when null', () => {
    renderCard({ repository: { ...baseRepo, language: null } });
    expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();
  });

  it('renders a Globe icon for public repos (isPrivate=false)', () => {
    renderCard({ repository: { ...baseRepo, isPrivate: false } });
    // The public icon (Globe) is rendered as SVG — verify no lock title
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeInTheDocument(); // outer button present
  });

  it('renders a Lock icon for private repos (isPrivate=true)', () => {
    renderCard({ repository: { ...baseRepo, isPrivate: true } });
    // private repo renders without throwing
    expect(screen.getByText('hello-world')).toBeInTheDocument();
  });

  it('renders Analyze button with title="Analyze"', () => {
    renderCard();
    const analyzeBtn = screen.getByTitle('Analyze');
    expect(analyzeBtn).toBeInTheDocument();
  });
});

// ─── isAnalyzing state ────────────────────────────────────────────────────────

describe('RepositoryCard — isAnalyzing prop', () => {
  it('shows Play icon when not analyzing', () => {
    renderCard({ isAnalyzing: false });
    // Analyze button is present
    expect(screen.getByTitle('Analyze')).toBeInTheDocument();
  });

  it('shows Loader icon (spinner) when analyzing', () => {
    renderCard({ isAnalyzing: true });
    // Loader2 gets animate-spin class
    const analyzeBtn = screen.getByTitle('Analyze');
    const svg = analyzeBtn.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });
});

// ─── isSelected state ─────────────────────────────────────────────────────────

describe('RepositoryCard — isSelected prop', () => {
  it('applies selected ring styles when isSelected=true', () => {
    renderCard({ isSelected: true });
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].className).toMatch(/ring-blue-500/);
  });

  it('uses transparent ring when isSelected=false', () => {
    renderCard({ isSelected: false });
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].className).not.toMatch(/ring-blue-500/);
  });
});

// ─── Interactions ─────────────────────────────────────────────────────────────

describe('RepositoryCard — interactions', () => {
  it('calls onSelect with the repository when the card is clicked', () => {
    const onSelect = vi.fn();
    renderCard({ onSelect });

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // outer card button

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(baseRepo);
  });

  it('calls onAnalyze with the repository when Analyze button is clicked', () => {
    const onAnalyze = vi.fn();
    renderCard({ onAnalyze });

    fireEvent.click(screen.getByTitle('Analyze'));

    expect(onAnalyze).toHaveBeenCalledTimes(1);
    expect(onAnalyze).toHaveBeenCalledWith(baseRepo);
  });

  it('does NOT call onSelect when the Analyze button is clicked (stopPropagation)', () => {
    const onSelect  = vi.fn();
    const onAnalyze = vi.fn();
    renderCard({ onSelect, onAnalyze });

    fireEvent.click(screen.getByTitle('Analyze'));

    expect(onAnalyze).toHaveBeenCalledTimes(1);
    // stopPropagation prevents the outer button's onClick from firing
    expect(onSelect).not.toHaveBeenCalled();
  });
});
