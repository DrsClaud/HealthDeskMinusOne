import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('services/firebase', () => ({ db: {} }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ userData: {} }) }));
jest.mock('../services/rxTermsService', () => ({
  rxTermsService: { searchMedications: jest.fn().mockResolvedValue([]) },
}));
jest.mock('services/adherenceService', () => ({
  adherenceService: {
    formatTimeForDisplay: (t) => t,
    enableReminders: jest.fn().mockResolvedValue(undefined),
    disableReminders: jest.fn().mockResolvedValue(undefined),
    updateReminderTimes: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../utils/timezoneUtils', () => ({
  getUserTimezoneWithFallback: () => 'America/New_York',
}));
jest.mock('../components/individual/medicationprogress/MedicationHabitTracker', () => ({
  __esModule: true,
  default: () => <div data-testid="habit-tracker" />,
}));

import MedicationsList from '../components/individual/medications/MedicationsList';
import MedicationList from '../components/individual/medications/MedicationList';
import MedicationForm from '../components/individual/medications/MedicationForm';
import MedicationSearch from '../components/individual/medications/MedicationSearch';
import MedicationCard from '../components/individual/medications/MedicationCard';
import MedicationAlerts from '../components/individual/medications/MedicationAlerts';

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };
const wrap = (Component, props = {}) =>
  render(
    <MemoryRouter future={routerFuture}>
      <Component {...props} />
    </MemoryRouter>
  );

describe('MedicationsList', () => {
  it('renders placeholder content', () => {
    render(<MedicationsList />);
    expect(screen.getByText(/Medication Management Component/i)).toBeInTheDocument();
  });
});

describe('MedicationList', () => {
  it('shows empty message when no medications', () => {
    render(<MedicationList medications={[]} />);
    expect(screen.getByText(/No medications added yet/i)).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    const { container } = render(<MedicationList medications={[]} loading />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('shows error alert when error prop is set', () => {
    render(<MedicationList medications={[]} error="Failed to load" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');
  });

  it('renders medication cards when medications provided', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <MedicationList
        medications={[{ id: '1', name: 'Aspirin' }]}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
  });
});

describe('MedicationForm', () => {
  it('renders without crashing when closed', () => {
    const { container } = wrap(MedicationForm, {
      open: false,
      onClose: () => {},
      onSave: () => {},
    });
    expect(container).toBeInTheDocument();
  });

  it('shows Add dialog when open', async () => {
    await act(async () => {
      wrap(MedicationForm, {
        open: true,
        onClose: () => {},
        onSave: () => {},
      });
    });
    expect(screen.getByText('Add New Medication')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Start typing medication name/i)).toBeInTheDocument();
  });

  it('shows Edit dialog when open with medication', async () => {
    await act(async () => {
      wrap(MedicationForm, {
        open: true,
        medication: { name: 'Ibuprofen', id: '1' },
        isEdit: true,
        onClose: () => {},
        onSave: () => {},
      });
    });
    expect(screen.getByText('Edit Medication')).toBeInTheDocument();
  });

  it('calls onClose when Cancel clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    wrap(MedicationForm, {
      open: true,
      onClose,
      onSave: () => {},
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /cancel/i }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSave and onClose when form submitted with required fields', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    await act(async () => {
      wrap(MedicationForm, {
        open: true,
        onClose,
        onSave,
      });
    });
    await user.type(screen.getByPlaceholderText(/Start typing medication name/i), 'Aspirin');
    await user.type(screen.getByLabelText(/^Dosage/i), '81mg');
    await user.type(screen.getByLabelText(/^Frequency/i), 'Once daily');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Save$/i }));
    });
    await screen.findByRole('button', { name: /^Save$/i }); // wait for loading to finish
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Aspirin',
        dosage: '81mg',
        frequency: 'Once daily',
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('includes optional fields when provided on submit', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    await act(async () => {
      wrap(MedicationForm, {
        open: true,
        onClose: () => {},
        onSave,
      });
    });
    await user.type(screen.getByPlaceholderText(/Start typing medication name/i), 'Ibuprofen');
    await user.type(screen.getByLabelText(/^Dosage/i), '200mg');
    await user.type(screen.getByLabelText(/^Frequency/i), 'Twice daily');
    await user.type(screen.getByLabelText(/^Prescribed by/i), 'Dr. Smith');
    await user.type(screen.getByLabelText(/^Pharmacy/i), 'CVS');
    await user.type(screen.getByLabelText(/Additional notes/i), 'Take with food');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Save$/i }));
    });
    await screen.findByRole('button', { name: /^Save$/i });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ibuprofen',
        dosage: '200mg',
        frequency: 'Twice daily',
        prescribedBy: 'Dr. Smith',
        pharmacy: 'CVS',
        notes: 'Take with food',
      })
    );
  });

  it('shows save error when onSave rejects', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockRejectedValue(new Error('Network error'));
    const origError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('Error saving medication')) return;
      origError.apply(console, args);
    };
    await act(async () => {
      wrap(MedicationForm, {
        open: true,
        onClose: () => {},
        onSave,
      });
    });
    await user.type(screen.getByPlaceholderText(/Start typing medication name/i), 'Aspirin');
    await user.type(screen.getByLabelText(/^Dosage/i), '81mg');
    await user.type(screen.getByLabelText(/^Frequency/i), 'Once daily');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Save$/i }));
    });
    expect(await screen.findByText(/Network error|Failed to save/i)).toBeInTheDocument();
    console.error = origError;
  });

  it('passes medication id when editing', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    await act(async () => {
      wrap(MedicationForm, {
        open: true,
        medication: { id: 'med-1', name: 'Aspirin', dosage: '81mg', frequency: 'Daily' },
        isEdit: true,
        onClose: () => {},
        onSave,
      });
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Update$/i }));
    });
    await screen.findByRole('button', { name: /^Update$/i });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'med-1' }));
  });
});

describe('MedicationSearch', () => {
  it('renders search input', () => {
    render(
      <MedicationSearch
        value=""
        onChange={() => {}}
        onSelect={() => {}}
      />
    );
    expect(screen.getByPlaceholderText(/Search for medication/i)).toBeInTheDocument();
  });

  it('displays value when passed as string', () => {
    render(
      <MedicationSearch
        value="Ibuprofen"
        onChange={() => {}}
        onSelect={() => {}}
      />
    );
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Ibuprofen');
  });

  it('displays clean name when value is object with displayName', () => {
    render(
      <MedicationSearch
        value={{ name: 'Aspirin [Bayer]', displayName: 'Aspirin [Bayer]', rxcui: '1191' }}
        onChange={() => {}}
        onSelect={() => {}}
      />
    );
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Aspirin');
  });
});

describe('MedicationCard', () => {
  it('renders medication name', () => {
    wrap(MedicationCard, {
      medication: { name: 'Aspirin', id: '1' },
      onEdit: () => {},
      onDelete: () => {},
    });
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    wrap(MedicationCard, {
      medication: { name: 'Aspirin', id: '1' },
      onEdit,
      onDelete: () => {},
    });
    await user.click(screen.getByLabelText(/edit medication/i));
    expect(onEdit).toHaveBeenCalledWith({ name: 'Aspirin', id: '1' });
  });

  it('expands and shows details when show more clicked', async () => {
    const user = userEvent.setup();
    wrap(MedicationCard, {
      medication: {
        name: 'Aspirin',
        id: '1',
        dosage: '81mg',
        frequency: 'Once daily',
        prescribedBy: 'Dr. Smith',
      },
      onEdit: () => {},
      onDelete: () => {},
    });
    await user.click(screen.getByLabelText(/show more/i));
    expect(screen.getByText('Medication Details')).toBeInTheDocument();
    expect(screen.getByText(/81mg/)).toBeInTheDocument();
    expect(screen.getByText(/Once daily/)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Smith/)).toBeInTheDocument();
  });

  it('shows Verified badge when medication has rxcui', () => {
    wrap(MedicationCard, {
      medication: { name: 'Aspirin', id: '1', rxcui: '1191' },
      onEdit: () => {},
      onDelete: () => {},
    });
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1);
  });
});

describe('MedicationAlerts', () => {
  const defaultAlertsProps = {
    medication: { name: 'Test', id: '1' },
    reminderStatus: { enabled: false, times: [] },
    optimisticReminderStatus: { enabled: false, times: [] },
    setOptimisticReminderStatus: () => {},
    onAdherenceChange: () => {},
    loading: false,
    setLoading: () => {},
    switchLoading: false,
    setSwitchLoading: () => {},
    trackingSummary: {},
  };

  it('renders without crashing with minimal props', async () => {
    let result;
    await act(async () => {
      result = wrap(MedicationAlerts, defaultAlertsProps);
    });
    expect(result.container).toBeInTheDocument();
  });

  // TODO: Re-enable when Twilio HIPAA BAA is in place
  it.skip('renders with alerts enabled', async () => {
    await act(async () => {
      wrap(MedicationAlerts, {
        ...defaultAlertsProps,
        reminderStatus: { enabled: true, times: ['08:00'] },
        optimisticReminderStatus: { enabled: true, times: ['08:00'] },
      });
    });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  // TODO: Re-enable when SMS alerts UI is restored (skeleton while loading)
  it('renders nothing when reminderStatus is null', async () => {
    await act(async () => {
      wrap(MedicationAlerts, {
        ...defaultAlertsProps,
        reminderStatus: null,
      });
    });
    expect(screen.queryByText('Alert Settings')).not.toBeInTheDocument();
    expect(document.querySelector('.MuiSkeleton-root')).not.toBeInTheDocument();
  });

  it.skip('opens phone verify dialog when enabling alerts without phone verified', async () => {
    const user = userEvent.setup();
    wrap(MedicationAlerts, { ...defaultAlertsProps });
    await act(async () => {
      await user.click(screen.getByRole('checkbox'));
    });
    expect(screen.getByText('Phone Verification Required')).toBeInTheDocument();
  });

  it.skip('opens Add Time dialog and confirm calls updateReminderTimes', async () => {
    const { adherenceService } = require('services/adherenceService');
    const user = userEvent.setup();
    wrap(MedicationAlerts, {
      ...defaultAlertsProps,
      optimisticReminderStatus: { enabled: true, times: [] },
    });
    const addTimeChip = screen.getByText('Add Time').closest('.MuiChip-root') || screen.getByText('Add Time');
    await act(async () => {
      await user.click(addTimeChip);
    });
    expect(screen.getByText(/Add a new reminder time/i)).toBeInTheDocument();
    const dialogAddBtn = screen.getAllByRole('button', { name: /add time/i }).find((b) => b.closest('[role="dialog"]'));
    await act(async () => {
      await user.click(dialogAddBtn);
    });
    expect(adherenceService.updateReminderTimes).toHaveBeenCalledWith(
      '1',
      expect.any(Array),
      'America/New_York'
    );
  });

  it.skip('Cancel in time picker closes dialog', async () => {
    const user = userEvent.setup();
    wrap(MedicationAlerts, {
      ...defaultAlertsProps,
      optimisticReminderStatus: { enabled: true, times: [] },
    });
    const addTimeChip = screen.getByText('Add Time').closest('.MuiChip-root') || screen.getByText('Add Time');
    await act(async () => {
      await user.click(addTimeChip);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /cancel/i }));
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it.skip('Edit Time dialog shows when editing existing time', async () => {
    const user = userEvent.setup();
    wrap(MedicationAlerts, {
      ...defaultAlertsProps,
      optimisticReminderStatus: { enabled: true, times: ['08:00'] },
    });
    await act(async () => {
      await user.click(screen.getByText('08:00'));
    });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/edit time|edit reminder time/i);
  });
});
