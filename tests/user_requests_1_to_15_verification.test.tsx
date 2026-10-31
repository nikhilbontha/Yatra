import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TicketPassCard } from '../src/components/tickets/TicketPassCard';
import { TripSettingsModal, StayModal, TicketModal } from '../src/components/Modals';
import { AccommodationView } from '../src/components/views/AccommodationView';
import { HomeView } from '../src/components/views/HomeView';
import { BudgetView } from '../src/components/views/BudgetView';
import { PlacesView } from '../src/components/views/PlacesView';
import { TransportView } from '../src/components/views/TransportView';
import { Header } from '../src/components/Header';
import { CONFIRMED_PILGRIMAGE_TRIP } from '../src/lib/db';
import { CONFIRMED_ITINERARY_DAYS, CONFIRMED_ACCOMMODATION_STAYS, getConfirmedTransportLegs, CONFIRMED_TRIP_ID } from '../src/lib/itinerary-data';
import { calculateBudget } from '../src/lib/calculations';
import { BookingDocument, Place, Expense, Trip } from '../src/types/trip';

describe('User Requests 1 to 15 Comprehensive Verification Suite', () => {
  const dummyTrip: Trip = {
    ...CONFIRMED_PILGRIMAGE_TRIP,
    id: CONFIRMED_TRIP_ID,
    startDate: '2026-11-17',
    endDate: '2026-12-05',
    totalBudget: 25000,
    openingCash: 5000,
    emergencyReserve: 3000,
    totalUpiAmount: 17000,
  };
  const dummyExpenses: Expense[] = [
    {
      id: 'exp-1',
      tripId: dummyTrip.id,
      title: 'IRCTC Sleeper Ticket',
      amount: 453.15,
      date: '2026-11-17',
      category: 'Transport',
      paymentMethod: 'UPI',
      isCashInflow: false,
      createdAt: '2026-10-30T10:00:00Z',
      updatedAt: '2026-10-30T10:00:00Z',
    },
    {
      id: 'exp-2',
      tripId: dummyTrip.id,
      title: 'Dharamshala Walk-in Advance',
      amount: 500,
      date: '2026-11-18',
      category: 'Accommodation',
      paymentMethod: 'Cash',
      isCashInflow: false,
      createdAt: '2026-10-30T10:00:00Z',
      updatedAt: '2026-10-30T10:00:00Z',
    },
  ];
  const budgetCalc = calculateBudget(dummyTrip, dummyExpenses);

  it('Item 1: TicketPassCard interchanged Seat/Berth with Class & Quota prominently', () => {
    const doc: BookingDocument = {
      id: 'doc-1',
      tripId: dummyTrip.id,
      title: 'hyd -> shirdi',
      docType: 'Train Ticket',
      pnr: '4447190834',
      trainNumber: '17002',
      classType: 'Sleeper Class (SL)',
      coachSeat: 'Coach S3 · Berth 64 (Side Upper (SU))',
      departureTime: '16:30',
      arrivalTime: '09:15',
      fromCity: 'Hyderabad / Secunderabad',
      toCity: 'Sainagar Shirdi',
      travelDate: '2026-11-17',
      totalAmount: 453.15,
      offlineCached: true,
      createdAt: '2026-10-30T00:00:00Z',
      updatedAt: '2026-10-30T00:00:00Z',
    };

    const html = renderToString(<TicketPassCard pass={doc} />);
    expect(html).toContain('Class &amp; Quota');
    expect(html).toContain('Seat / Berth');
    expect(html).toContain('Sleeper Class (SL)');
    expect(html).toContain('Coach S3 · Berth 64 (Side Upper (SU))');
  });

  it('Item 3 & 13: Header provides mandala back button and non-overlapping sync layout', () => {
    const onBackSpy = vi.fn();
    const html = renderToString(
      <Header
        trip={dummyTrip}
        isOnline={true}
        pendingSyncCount={0}
        isSyncing={false}
        syncStatus="synced"
        cloudUser={null}
        onBack={onBackSpy}
        onSync={() => {}}
        onQuickAdd={() => {}}
        onOpenSettings={() => {}}
      />
    );
    expect(html).toContain('Click Temple to go back to previous page');
    expect(html).toContain('Go back to previous page');
    expect(html).toContain('Sync');
  });

  it('Item 4: TripSettingsModal handles zero and empty strings without sticky leading zero', () => {
    const tripWithZero = { ...dummyTrip, totalBudget: 0 };
    const html = renderToString(
      <TripSettingsModal trip={tripWithZero} onSave={() => {}} onClose={() => {}} />
    );
    expect(html).toContain('placeholder="e.g. 25000"');
    expect(html).toContain('value=""');
  });

  it('Item 5 & 11: StayModal provides Payment Mode toggle and exact geo-location link', () => {
    const html = renderToString(
      <StayModal isOpen={true} days={CONFIRMED_ITINERARY_DAYS} onSave={() => {}} onClose={() => {}} />
    );
    expect(html).toContain('Exact Location / Google Maps Link (Optional)');
    expect(html).toContain('Payment Mode');
    expect(html).toContain('UPI');
    expect(html).toContain('Cash');
  });

  it('Item 6: AccommodationView renders 3D Ticket-style Upcoming Stay showcase card', () => {
    const html = renderToString(
      <AccommodationView
        trip={dummyTrip}
        days={CONFIRMED_ITINERARY_DAYS}
        accommodations={CONFIRMED_ACCOMMODATION_STAYS}
        onSaveStay={() => {}}
        onDeleteStay={() => {}}
      />
    );
    expect(html).toContain('Pilgrimage Stay Voucher');
    expect(html).toContain('Check-in Date');
    expect(html).toContain('Check-out Date');
    expect(html).toContain('Offline Safe');
    expect(html).toContain('PILGRIM-STAY');
  });

  it('Item 7: HomeView budget overview calculates total remaining (UPI + Cash combined)', () => {
    const html = renderToString(
      <HomeView
        trip={dummyTrip}
        days={CONFIRMED_ITINERARY_DAYS}
        expenses={dummyExpenses}
        bookings={[]}
        transportLegs={[]}
        checklists={[]}
        places={[]}
        budgetCalc={budgetCalc}
        cloudUser={null}
        syncStatus="synced"
        isSyncing={false}
        onSync={() => {}}
        onNavigateToTab={() => {}}
        onNavigateToMoreSubTab={() => {}}
        onSelectDay={() => {}}
        onAddExpense={() => {}}
        onAddTicket={() => {}}
        onAddChecklist={() => {}}
        onEditTripSettings={() => {}}
        onToggleTask={() => {}}
      />
    );
    expect(html).toContain('Remaining');
    expect(html).toContain('₹24,046.85');
    expect(html).toContain('Available Wallet:');
    expect(html).toContain('UPI:');
    expect(html).toContain('Cash:');
  });

  it('Item 8: HomeView renders redesigned Upcoming Itinerary and Budget Overview with 3D elevation', () => {
    const html = renderToString(
      <HomeView
        trip={dummyTrip}
        days={CONFIRMED_ITINERARY_DAYS}
        expenses={dummyExpenses}
        bookings={[]}
        transportLegs={[]}
        checklists={[]}
        places={[]}
        budgetCalc={budgetCalc}
        cloudUser={null}
        syncStatus="synced"
        isSyncing={false}
        onSync={() => {}}
        onNavigateToTab={() => {}}
        onNavigateToMoreSubTab={() => {}}
        onSelectDay={() => {}}
        onAddExpense={() => {}}
        onAddTicket={() => {}}
        onAddChecklist={() => {}}
        onEditTripSettings={() => {}}
        onToggleTask={() => {}}
      />
    );
    expect(html).toContain('Upcoming Itinerary');
    expect(html).toContain('View All 19 Days');
    expect(html).toContain('Budget Overview');
    expect(html).toContain('Total Budget');
    expect(html).toContain('Spent');
  });

  it('Item 9: BudgetView renders full interactive Monthly Calendar with November & December 2026', () => {
    const html = renderToString(
      <BudgetView
        trip={dummyTrip}
        expenses={dummyExpenses}
        budgetCalc={budgetCalc}
        onAddExpense={() => {}}
        onEditExpense={() => {}}
        onDeleteExpense={() => {}}
        onEditTripSettings={() => {}}
      />
    );
    expect(html).toContain('November');
    expect(html).toContain('December');
    expect(html).toContain('2026');
    expect(html).toContain('Previous Month');
    expect(html).toContain('Next Month');
    expect(html).toContain('Sun');
    expect(html).toContain('Mon');
    expect(html).toContain('Day Total:');
  });

  it('Item 10: TransportView renders Edit option for journey passes', () => {
    const legs = getConfirmedTransportLegs();
    const html = renderToString(
      <TransportView
        trip={dummyTrip}
        days={CONFIRMED_ITINERARY_DAYS}
        transportLegs={legs}
      />
    );
    expect(html).toContain('Edit');
    expect(html).toContain('19-Day Pilgrimage Journey Passes');
  });

  it('Item 12: PlacesView renders 4 interactive filter buttons (Jyotirlingas, Other Temples, Sightseeing, Total Places)', () => {
    const samplePlaces: Place[] = [
      {
        id: 'place-1',
        tripId: dummyTrip.id,
        name: 'Trimbakeshwar Shiva Temple',
        city: 'Nashik',
        placeType: 'Jyotirlinga',
        category: 'Jyotirlinga',
        isVisited: false,
        needsVerification: false,
        createdAt: '2026-10-30T00:00:00Z',
        updatedAt: '2026-10-30T00:00:00Z',
      },
      {
        id: 'place-2',
        tripId: dummyTrip.id,
        name: 'Sai Baba Samadhi Mandir',
        city: 'Shirdi',
        placeType: 'Temple',
        category: 'Temple',
        isVisited: false,
        needsVerification: false,
        createdAt: '2026-10-30T00:00:00Z',
        updatedAt: '2026-10-30T00:00:00Z',
      },
    ];

    const html = renderToString(
      <PlacesView
        trip={dummyTrip}
        days={CONFIRMED_ITINERARY_DAYS}
        places={samplePlaces}
      />
    );
    expect(html).toContain('7 Jyotirlingas');
    expect(html).toContain('Other Temples');
    expect(html).toContain('Sightseeing');
    expect(html).toContain('Total Places');
    expect(html).toContain('title="Click to view all Jyotirlingas"');
  });

  it('New Request Item 5: IRCTC e-ticket does not contain (+1) in arrival time', () => {
    const doc: BookingDocument = {
      id: 'doc-1',
      tripId: dummyTrip.id,
      title: 'hyd -> shirdi',
      docType: 'Train Ticket',
      pnr: '4447190834',
      trainNumber: '17002',
      classType: 'Sleeper Class (SL)',
      coachSeat: 'Coach S3 · Berth 64 (Side Upper (SU))',
      departureTime: '16:30',
      arrivalTime: '09:15',
      fromCity: 'Hyderabad / Secunderabad',
      toCity: 'Sainagar Shirdi',
      travelDate: '2026-11-17',
      totalAmount: 453.15,
      offlineCached: true,
      createdAt: '2026-10-30T00:00:00Z',
      updatedAt: '2026-10-30T00:00:00Z',
    };
    const html = renderToString(<TicketPassCard pass={doc} />);
    expect(html).toContain('09:15');
    expect(html).not.toContain('(+1)');
  });

  it('New Request Item 6 & 7: Hero banner features 3D glass badges and Accommodation features Stay Document Viewer', () => {
    const homeHtml = renderToString(
      <HomeView
        trip={dummyTrip}
        days={CONFIRMED_ITINERARY_DAYS}
        expenses={dummyExpenses}
        bookings={[]}
        transportLegs={[]}
        checklists={[]}
        places={[]}
        budgetCalc={budgetCalc}
        cloudUser={null}
        syncStatus="synced"
        isSyncing={false}
        onSync={() => {}}
        onNavigateToTab={() => {}}
        onNavigateToMoreSubTab={() => {}}
        onSelectDay={() => {}}
        onAddExpense={() => {}}
        onAddTicket={() => {}}
        onAddChecklist={() => {}}
        onEditTripSettings={() => {}}
        onToggleTask={() => {}}
      />
    );
    expect(homeHtml).toContain('Sacred Jyotirlinga Circuit');
    expect(homeHtml).toContain('Explore Pilgrimage');

    const accomHtml = renderToString(
      <AccommodationView
        trip={dummyTrip}
        days={CONFIRMED_ITINERARY_DAYS}
        accommodations={CONFIRMED_ACCOMMODATION_STAYS}
        onSaveStay={() => {}}
        onDeleteStay={() => {}}
      />
    );
    expect(accomHtml).toContain('title="View Stay Document / Voucher"');
  });
});
