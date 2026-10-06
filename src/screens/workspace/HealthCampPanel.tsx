import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  UserCheck,
} from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface Camp {
  id: string;
  name: string;
  date: string;
  location: string;
  whatToBring?: string;
}

interface Slot {
  id: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
}

interface Station {
  id: string;
  name: string;
  sort: number;
}

interface CampStatus {
  registered: boolean;
  checkedIn: boolean;
  completedStations: string[];
  slotId?: string | null;
}

interface BookingResponse {
  bookingId: string;
  camp: {
    id: string;
    name: string;
    date: string;
    location: string;
    whatToBring: string;
  };
  slot: {
    id: string;
    slotStart: string;
    slotEnd: string;
  };
}

type Language = 'EN' | 'TE' | 'HI';

const copy: Record<Language, {
  eyebrow: string;
  heading: string;
  description: string;
  chooseSlot: string;
  booked: string;
  registered: string;
  available: string;
  full: string;
  bookSlot: string;
  booking: string;
  confirmationEyebrow: string;
  confirmationTitle: string;
  slot: string;
  place: string;
  camp: string;
  date: string;
  whatToBring: string;
  addToCalendar: string;
  backToCamps: string;
  bookingSuccess: string;
  checkIn: string;
  checkedIn: string;
  healthCampProgress: string;
  complete: string;
  done: string;
  noSlots: string;
  noSlotsDescription: string;
}> = {
  EN: {
    eyebrow: 'HEALTH CAMPS',
    heading: 'Choose a camp slot.',
    description: 'Pick a health camp, select an available time, and keep your booking details ready.',
    chooseSlot: 'Choose slot',
    booked: 'Booked',
    registered: 'Registered',
    available: 'available',
    full: 'Full',
    bookSlot: 'Book this slot',
    booking: 'BookingÃ¢â‚¬Â¦',
    confirmationEyebrow: 'BOOKING CONFIRMED',
    confirmationTitle: 'Your health camp slot is confirmed.',
    slot: 'Slot',
    place: 'Place',
    camp: 'Camp',
    date: 'Date',
    whatToBring: 'What to bring',
    addToCalendar: 'Add to calendar',
    backToCamps: 'Back to health camps',
    bookingSuccess: 'Your health camp slot is booked.',
    checkIn: 'Check in',
    checkedIn: 'Checked in',
    healthCampProgress: 'Health camp progress',
    complete: 'Complete',
    done: 'Done',
    noSlots: 'No slots available yet.',
    noSlotsDescription: 'This camp does not have published booking slots yet.',
  },
  TE: {
    eyebrow: 'Ã Â°â€ Ã Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â±ÂÃ Â°Â¯ Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°Â¾Ã Â°Â²Ã Â±Â',
    heading: 'Ã Â°â€¢Ã Â±ÂÃ Â°Â¯Ã Â°Â¾Ã Â°â€šÃ Â°ÂªÃ Â±Â Ã Â°Â¸Ã Â°Â®Ã Â°Â¯Ã Â°Â¾Ã Â°Â¨Ã Â±ÂÃ Â°Â¨Ã Â°Â¿ Ã Â°Å½Ã Â°â€šÃ Â°Å¡Ã Â±ÂÃ Â°â€¢Ã Â±â€¹Ã Â°â€šÃ Â°Â¡Ã Â°Â¿.',
    description: 'Ã Â°â€ Ã Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â±ÂÃ Â°Â¯ Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°Â¾Ã Â°Â¨Ã Â±ÂÃ Â°Â¨Ã Â°Â¿ Ã Â°Å½Ã Â°â€šÃ Â°Å¡Ã Â±ÂÃ Â°â€¢Ã Â±ÂÃ Â°Â¨Ã Â°Â¿, Ã Â°â€¦Ã Â°â€šÃ Â°Â¦Ã Â±ÂÃ Â°Â¬Ã Â°Â¾Ã Â°Å¸Ã Â±ÂÃ Â°Â²Ã Â±â€¹ Ã Â°â€°Ã Â°Â¨Ã Â±ÂÃ Â°Â¨ Ã Â°Â¸Ã Â°Â®Ã Â°Â¯Ã Â°Â¾Ã Â°Â¨Ã Â±ÂÃ Â°Â¨Ã Â°Â¿ Ã Â°Â¬Ã Â±ÂÃ Â°â€¢Ã Â±Â Ã Â°Å¡Ã Â±â€¡Ã Â°Â¸Ã Â±ÂÃ Â°â€¢Ã Â±â€¹Ã Â°â€šÃ Â°Â¡Ã Â°Â¿.',
    chooseSlot: 'Ã Â°Â¸Ã Â±ÂÃ Â°Â²Ã Â°Â¾Ã Â°Å¸Ã Â±Â Ã Â°Å½Ã Â°â€šÃ Â°Å¡Ã Â±ÂÃ Â°â€¢Ã Â±â€¹Ã Â°â€šÃ Â°Â¡Ã Â°Â¿',
    booked: 'Ã Â°Â¬Ã Â±ÂÃ Â°â€¢Ã Â±Â Ã Â°â€¦Ã Â°Â¯Ã Â°Â¿Ã Â°â€šÃ Â°Â¦Ã Â°Â¿',
    registered: 'Ã Â°Â¨Ã Â°Â®Ã Â±â€¹Ã Â°Â¦Ã Â±Â Ã Â°â€¦Ã Â°Â¯Ã Â°Â¿Ã Â°â€šÃ Â°Â¦Ã Â°Â¿',
    available: 'Ã Â°â€¦Ã Â°â€šÃ Â°Â¦Ã Â±ÂÃ Â°Â¬Ã Â°Â¾Ã Â°Å¸Ã Â±ÂÃ Â°Â²Ã Â±â€¹',
    full: 'Ã Â°ÂªÃ Â±â€šÃ Â°Â°Ã Â±ÂÃ Â°Â¤Ã Â±Ë†Ã Â°â€šÃ Â°Â¦Ã Â°Â¿',
    bookSlot: 'Ã Â°Ë† Ã Â°Â¸Ã Â±ÂÃ Â°Â²Ã Â°Â¾Ã Â°Å¸Ã Â±Â Ã Â°Â¬Ã Â±ÂÃ Â°â€¢Ã Â±Â Ã Â°Å¡Ã Â±â€¡Ã Â°Â¯Ã Â°â€šÃ Â°Â¡Ã Â°Â¿',
    booking: 'Ã Â°Â¬Ã Â±ÂÃ Â°â€¢Ã Â±Â Ã Â°Å¡Ã Â±â€¡Ã Â°Â¸Ã Â±ÂÃ Â°Â¤Ã Â±â€¹Ã Â°â€šÃ Â°Â¦Ã Â°Â¿Ã¢â‚¬Â¦',
    confirmationEyebrow: 'Ã Â°Â¬Ã Â±ÂÃ Â°â€¢Ã Â°Â¿Ã Â°â€šÃ Â°â€”Ã Â±Â Ã Â°Â¨Ã Â°Â¿Ã Â°Â°Ã Â±ÂÃ Â°Â§Ã Â°Â¾Ã Â°Â°Ã Â°Â¿Ã Â°â€šÃ Â°Å¡Ã Â°Â¬Ã Â°Â¡Ã Â°Â¿Ã Â°â€šÃ Â°Â¦Ã Â°Â¿',
    confirmationTitle: 'Ã Â°Â®Ã Â±â‚¬ Ã Â°â€ Ã Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â±ÂÃ Â°Â¯ Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°â€š Ã Â°Â¸Ã Â±ÂÃ Â°Â²Ã Â°Â¾Ã Â°Å¸Ã Â±Â Ã Â°Â¨Ã Â°Â¿Ã Â°Â°Ã Â±ÂÃ Â°Â§Ã Â°Â¾Ã Â°Â°Ã Â°Â¿Ã Â°â€šÃ Â°Å¡Ã Â°Â¬Ã Â°Â¡Ã Â°Â¿Ã Â°â€šÃ Â°Â¦Ã Â°Â¿.',
    slot: 'Ã Â°Â¸Ã Â±ÂÃ Â°Â²Ã Â°Â¾Ã Â°Å¸Ã Â±Â',
    place: 'Ã Â°Â¸Ã Â±ÂÃ Â°Â¥Ã Â°Â²Ã Â°â€š',
    camp: 'Ã Â°â€¢Ã Â±ÂÃ Â°Â¯Ã Â°Â¾Ã Â°â€šÃ Â°ÂªÃ Â±Â',
    date: 'Ã Â°Â¤Ã Â±â€¡Ã Â°Â¦Ã Â±â‚¬',
    whatToBring: 'Ã Â°Â¤Ã Â±â‚¬Ã Â°Â¸Ã Â±ÂÃ Â°â€¢Ã Â±ÂÃ Â°Â°Ã Â°Â¾Ã Â°ÂµÃ Â°Â¾Ã Â°Â²Ã Â±ÂÃ Â°Â¸Ã Â°Â¿Ã Â°Â¨Ã Â°ÂµÃ Â°Â¿',
    addToCalendar: 'Ã Â°â€¢Ã Â±ÂÃ Â°Â¯Ã Â°Â¾Ã Â°Â²Ã Â±â€ Ã Â°â€šÃ Â°Â¡Ã Â°Â°Ã Â±ÂÃ¢â‚¬Å’Ã Â°â€¢Ã Â±Â Ã Â°Å“Ã Â±â€¹Ã Â°Â¡Ã Â°Â¿Ã Â°â€šÃ Â°Å¡Ã Â°â€šÃ Â°Â¡Ã Â°Â¿',
    backToCamps: 'Ã Â°â€ Ã Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â±ÂÃ Â°Â¯ Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°Â¾Ã Â°Â²Ã Â°â€¢Ã Â±Â Ã Â°Â¤Ã Â°Â¿Ã Â°Â°Ã Â°Â¿Ã Â°â€”Ã Â°Â¿ Ã Â°ÂµÃ Â±â€ Ã Â°Â³Ã Â±ÂÃ Â°Â²Ã Â°â€šÃ Â°Â¡Ã Â°Â¿',
    bookingSuccess: 'Ã Â°Â®Ã Â±â‚¬ Ã Â°â€ Ã Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â±ÂÃ Â°Â¯ Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°â€š Ã Â°Â¸Ã Â±ÂÃ Â°Â²Ã Â°Â¾Ã Â°Å¸Ã Â±Â Ã Â°Â¬Ã Â±ÂÃ Â°â€¢Ã Â±Â Ã Â°â€¦Ã Â°Â¯Ã Â°Â¿Ã Â°â€šÃ Â°Â¦Ã Â°Â¿.',
    checkIn: 'Ã Â°Å¡Ã Â±â€ Ã Â°â€¢Ã Â±Â Ã Â°â€¡Ã Â°Â¨Ã Â±Â',
    checkedIn: 'Ã Â°Å¡Ã Â±â€ Ã Â°â€¢Ã Â±Â Ã Â°â€¡Ã Â°Â¨Ã Â±Â Ã Â°â€¦Ã Â°Â¯Ã Â°Â¿Ã Â°â€šÃ Â°Â¦Ã Â°Â¿',
    healthCampProgress: 'Ã Â°â€ Ã Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â±ÂÃ Â°Â¯ Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°â€š Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â°Â¤Ã Â°Â¿',
    complete: 'Ã Â°ÂªÃ Â±â€šÃ Â°Â°Ã Â±ÂÃ Â°Â¤Ã Â°Â¿ Ã Â°Å¡Ã Â±â€¡Ã Â°Â¯Ã Â°â€šÃ Â°Â¡Ã Â°Â¿',
    done: 'Ã Â°ÂªÃ Â±â€šÃ Â°Â°Ã Â±ÂÃ Â°Â¤Ã Â±Ë†Ã Â°â€šÃ Â°Â¦Ã Â°Â¿',
    noSlots: 'Ã Â°â€¡Ã Â°â€šÃ Â°â€¢Ã Â°Â¾ Ã Â°Â¸Ã Â±ÂÃ Â°Â²Ã Â°Â¾Ã Â°Å¸Ã Â±ÂÃ Â°Â²Ã Â±Â Ã Â°â€¦Ã Â°â€šÃ Â°Â¦Ã Â±ÂÃ Â°Â¬Ã Â°Â¾Ã Â°Å¸Ã Â±ÂÃ Â°Â²Ã Â±â€¹ Ã Â°Â²Ã Â±â€¡Ã Â°ÂµÃ Â±Â.',
    noSlotsDescription: 'Ã Â°Ë† Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°Â¾Ã Â°Â¨Ã Â°Â¿Ã Â°â€¢Ã Â°Â¿ Ã Â°â€¡Ã Â°â€šÃ Â°â€¢Ã Â°Â¾ Ã Â°Â¬Ã Â±ÂÃ Â°â€¢Ã Â°Â¿Ã Â°â€šÃ Â°â€”Ã Â±Â Ã Â°Â¸Ã Â±ÂÃ Â°Â²Ã Â°Â¾Ã Â°Å¸Ã Â±ÂÃ Â°Â²Ã Â±Â Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â°Å¡Ã Â±ÂÃ Â°Â°Ã Â°Â¿Ã Â°â€šÃ Â°Å¡Ã Â°Â²Ã Â±â€¡Ã Â°Â¦Ã Â±Â.',
  },
  HI: {
    eyebrow: 'Ã Â¤Â¸Ã Â¥ÂÃ Â¤ÂµÃ Â¤Â¾Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â°',
    heading: 'Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â° Ã Â¤â€¢Ã Â¤Â¾ Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â²Ã Â¥â€°Ã Â¤Å¸ Ã Â¤Å¡Ã Â¥ÂÃ Â¤Â¨Ã Â¥â€¡Ã Â¤â€šÃ Â¥Â¤',
    description: 'Ã Â¤Â¸Ã Â¥ÂÃ Â¤ÂµÃ Â¤Â¾Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â° Ã Â¤Å¡Ã Â¥ÂÃ Â¤Â¨Ã Â¥â€¡Ã Â¤â€š, Ã Â¤â€°Ã Â¤ÂªÃ Â¤Â²Ã Â¤Â¬Ã Â¥ÂÃ Â¤Â§ Ã Â¤Â¸Ã Â¤Â®Ã Â¤Â¯ Ã Â¤Â¬Ã Â¥ÂÃ Â¤â€¢ Ã Â¤â€¢Ã Â¤Â°Ã Â¥â€¡Ã Â¤â€š Ã Â¤â€Ã Â¤Â° Ã Â¤â€¦Ã Â¤ÂªÃ Â¤Â¨Ã Â¥â‚¬ Ã Â¤Â¬Ã Â¥ÂÃ Â¤â€¢Ã Â¤Â¿Ã Â¤â€šÃ Â¤â€” Ã Â¤Å“Ã Â¤Â¾Ã Â¤Â¨Ã Â¤â€¢Ã Â¤Â¾Ã Â¤Â°Ã Â¥â‚¬ Ã Â¤Â¤Ã Â¥Ë†Ã Â¤Â¯Ã Â¤Â¾Ã Â¤Â° Ã Â¤Â°Ã Â¤â€“Ã Â¥â€¡Ã Â¤â€šÃ Â¥Â¤',
    chooseSlot: 'Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â²Ã Â¥â€°Ã Â¤Å¸ Ã Â¤Å¡Ã Â¥ÂÃ Â¤Â¨Ã Â¥â€¡Ã Â¤â€š',
    booked: 'Ã Â¤Â¬Ã Â¥ÂÃ Â¤â€¢ Ã Â¤Â¹Ã Â¥â€¹ Ã Â¤â€”Ã Â¤Â¯Ã Â¤Â¾',
    registered: 'Ã Â¤ÂªÃ Â¤â€šÃ Â¤Å“Ã Â¥â‚¬Ã Â¤â€¢Ã Â¥Æ’Ã Â¤Â¤',
    available: 'Ã Â¤â€°Ã Â¤ÂªÃ Â¤Â²Ã Â¤Â¬Ã Â¥ÂÃ Â¤Â§',
    full: 'Ã Â¤Â­Ã Â¤Â° Ã Â¤â€”Ã Â¤Â¯Ã Â¤Â¾',
    bookSlot: 'Ã Â¤Â¯Ã Â¤Â¹ Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â²Ã Â¥â€°Ã Â¤Å¸ Ã Â¤Â¬Ã Â¥ÂÃ Â¤â€¢ Ã Â¤â€¢Ã Â¤Â°Ã Â¥â€¡Ã Â¤â€š',
    booking: 'Ã Â¤Â¬Ã Â¥ÂÃ Â¤â€¢ Ã Â¤Â¹Ã Â¥â€¹ Ã Â¤Â°Ã Â¤Â¹Ã Â¤Â¾ Ã Â¤Â¹Ã Â¥Ë†Ã¢â‚¬Â¦',
    confirmationEyebrow: 'Ã Â¤Â¬Ã Â¥ÂÃ Â¤â€¢Ã Â¤Â¿Ã Â¤â€šÃ Â¤â€” Ã Â¤â€¢Ã Â¥â‚¬ Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â·Ã Â¥ÂÃ Â¤Å¸Ã Â¤Â¿',
    confirmationTitle: 'Ã Â¤â€ Ã Â¤ÂªÃ Â¤â€¢Ã Â¤Â¾ Ã Â¤Â¸Ã Â¥ÂÃ Â¤ÂµÃ Â¤Â¾Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â° Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â²Ã Â¥â€°Ã Â¤Å¸ Ã Â¤ÂªÃ Â¤â€¢Ã Â¥ÂÃ Â¤â€¢Ã Â¤Â¾ Ã Â¤Â¹Ã Â¥â€¹ Ã Â¤â€”Ã Â¤Â¯Ã Â¤Â¾ Ã Â¤Â¹Ã Â¥Ë†Ã Â¥Â¤',
    slot: 'Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â²Ã Â¥â€°Ã Â¤Å¸',
    place: 'Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¤Â¾Ã Â¤Â¨',
    camp: 'Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â°',
    date: 'Ã Â¤Â¤Ã Â¤Â¾Ã Â¤Â°Ã Â¥â‚¬Ã Â¤â€“',
    whatToBring: 'Ã Â¤â€¢Ã Â¥ÂÃ Â¤Â¯Ã Â¤Â¾ Ã Â¤Â²Ã Â¤Â¾Ã Â¤Â¨Ã Â¤Â¾ Ã Â¤Â¹Ã Â¥Ë†',
    addToCalendar: 'Ã Â¤â€¢Ã Â¥Ë†Ã Â¤Â²Ã Â¥â€¡Ã Â¤â€šÃ Â¤Â¡Ã Â¤Â° Ã Â¤Â®Ã Â¥â€¡Ã Â¤â€š Ã Â¤Å“Ã Â¥â€¹Ã Â¤Â¡Ã Â¤Â¼Ã Â¥â€¡Ã Â¤â€š',
    backToCamps: 'Ã Â¤Â¸Ã Â¥ÂÃ Â¤ÂµÃ Â¤Â¾Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â°Ã Â¥â€¹Ã Â¤â€š Ã Â¤ÂªÃ Â¤Â° Ã Â¤ÂµÃ Â¤Â¾Ã Â¤ÂªÃ Â¤Â¸ Ã Â¤Å“Ã Â¤Â¾Ã Â¤ÂÃ Â¤Â',
    bookingSuccess: 'Ã Â¤â€ Ã Â¤ÂªÃ Â¤â€¢Ã Â¤Â¾ Ã Â¤Â¸Ã Â¥ÂÃ Â¤ÂµÃ Â¤Â¾Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â° Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â²Ã Â¥â€°Ã Â¤Å¸ Ã Â¤Â¬Ã Â¥ÂÃ Â¤â€¢ Ã Â¤Â¹Ã Â¥â€¹ Ã Â¤â€”Ã Â¤Â¯Ã Â¤Â¾ Ã Â¤Â¹Ã Â¥Ë†Ã Â¥Â¤',
    checkIn: 'Ã Â¤Å¡Ã Â¥â€¡Ã Â¤â€¢ Ã Â¤â€¡Ã Â¤Â¨',
    checkedIn: 'Ã Â¤Å¡Ã Â¥â€¡Ã Â¤â€¢ Ã Â¤â€¡Ã Â¤Â¨ Ã Â¤Â¹Ã Â¥â€¹ Ã Â¤â€”Ã Â¤Â¯Ã Â¤Â¾',
    healthCampProgress: 'Ã Â¤Â¸Ã Â¥ÂÃ Â¤ÂµÃ Â¤Â¾Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â° Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¤â€”Ã Â¤Â¤Ã Â¤Â¿',
    complete: 'Ã Â¤ÂªÃ Â¥â€šÃ Â¤Â°Ã Â¤Â¾ Ã Â¤â€¢Ã Â¤Â°Ã Â¥â€¡Ã Â¤â€š',
    done: 'Ã Â¤ÂªÃ Â¥â€šÃ Â¤Â°Ã Â¤Â¾ Ã Â¤Â¹Ã Â¥ÂÃ Â¤â€ ',
    noSlots: 'Ã Â¤â€¦Ã Â¤Â­Ã Â¥â‚¬ Ã Â¤â€¢Ã Â¥â€¹Ã Â¤Ë† Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â²Ã Â¥â€°Ã Â¤Å¸ Ã Â¤â€°Ã Â¤ÂªÃ Â¤Â²Ã Â¤Â¬Ã Â¥ÂÃ Â¤Â§ Ã Â¤Â¨Ã Â¤Â¹Ã Â¥â‚¬Ã Â¤â€š Ã Â¤Â¹Ã Â¥Ë†Ã Â¥Â¤',
    noSlotsDescription: 'Ã Â¤â€¡Ã Â¤Â¸ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â° Ã Â¤â€¢Ã Â¥â€¡ Ã Â¤Â²Ã Â¤Â¿Ã Â¤Â Ã Â¤â€¦Ã Â¤Â­Ã Â¥â‚¬ Ã Â¤Â¬Ã Â¥ÂÃ Â¤â€¢Ã Â¤Â¿Ã Â¤â€šÃ Â¤â€” Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â²Ã Â¥â€°Ã Â¤Å¸ Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¤â€¢Ã Â¤Â¾Ã Â¤Â¶Ã Â¤Â¿Ã Â¤Â¤ Ã Â¤Â¨Ã Â¤Â¹Ã Â¥â‚¬Ã Â¤â€š Ã Â¤Â¹Ã Â¥ÂÃ Â¤Â Ã Â¤Â¹Ã Â¥Ë†Ã Â¤â€šÃ Â¥Â¤',
  },
};

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function parseSlotTime(value: string): { hours: number; minutes: number } | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (hours === 12) hours = 0;
  if (meridiem === 'PM') hours += 12;

  return { hours, minutes };
}

function icsDate(date: string, time: string): string | null {
  const parts = date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  const parsed = parseSlotTime(time);
  if (!parsed) return null;

  const [year, month, day] = parts;
  const hh = String(parsed.hours).padStart(2, '0');
  const mm = String(parsed.minutes).padStart(2, '0');

  return `${String(year).padStart(4, '0')}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${hh}${mm}00`;
}

function addBookingToCalendar(booking: BookingResponse): void {
  const start = icsDate(booking.camp.date, booking.slot.slotStart);
  const end = icsDate(booking.camp.date, booking.slot.slotEnd);
  if (!start || !end) return;

  const description = [
    `Health camp: ${booking.camp.name}`,
    `Slot: ${booking.slot.slotStart} - ${booking.slot.slotEnd}`,
    `Place: ${booking.camp.location || 'Campus'}`,
    `What to bring: ${booking.camp.whatToBring || 'No special items listed.'}`,
  ].join('\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Studentkare//Health Camp//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.bookingId}@studentkare`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(booking.camp.name)}`,
    `LOCATION:${escapeIcsText(booking.camp.location || 'Campus')}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${booking.camp.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'health-camp'}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function HealthCampPanel() {
  const camps = useApiResource<{ items: Camp[] }>('/camps');
  const [selected, setSelected] = useState('');
  const status = useApiResource<CampStatus>(selected ? `/camps/${selected}/me` : '');
  const slots = useApiResource<{ items: Slot[] }>(selected ? `/camps/${selected}/slots` : '');
  const stations = useApiResource<{ items: Station[] }>(selected ? `/camps/${selected}/stations` : '');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [confirmation, setConfirmation] = useState<BookingResponse | null>(null);
  const [notice, setNotice] = useState('');
  const [language, setLanguage] = useState<Language>('EN');
  const mutation = useMutation();
  const t = copy[language];

  const selectedCamp = camps.data?.items.find(camp => camp.id === selected);
  const completed = status.data?.completedStations || [];
  const bookedSlot = slots.data?.items.find(slot => slot.id === status.data?.slotId);
  const availableSlots = slots.data?.items || [];

  useEffect(() => {
    if (
      !selectedCamp ||
      !status.data?.registered ||
      !status.data.slotId ||
      !bookedSlot ||
      confirmation
    ) {
      return;
    }

    setConfirmation({
      bookingId: `${selectedCamp.id}:${bookedSlot.id}`,
      camp: {
        id: selectedCamp.id,
        name: selectedCamp.name,
        date: selectedCamp.date,
        location: selectedCamp.location,
        whatToBring: selectedCamp.whatToBring || '',
      },
      slot: {
        id: bookedSlot.id,
        slotStart: bookedSlot.slotStart,
        slotEnd: bookedSlot.slotEnd,
      },
    });
  }, [selectedCamp, status.data?.registered, status.data?.slotId, bookedSlot, confirmation]);

  const selectCamp = (campId: string) => {
    setSelected(campId);
    setSelectedSlotId('');
    setConfirmation(null);
    setNotice('');
    status.reload();
    slots.reload();
    stations.reload();
  };

  const bookSlot = () => {
    if (!selected || !selectedSlotId) return;

    mutation.run(
      () => apiRequest<BookingResponse>(`/camps/${selected}/book`, {
        method: 'POST',
        body: JSON.stringify({ slotId: selectedSlotId }),
      }),
      result => {
        setConfirmation(result);
        setNotice(t.bookingSuccess);
        status.reload();
        slots.reload();
        stations.reload();
      },
    );
  };

  const checkIn = () => mutation.run(
    () => apiRequest(`/camps/${selected}/check-in`, { method: 'POST' }),
    () => {
      setNotice(t.checkedIn);
      status.reload();
    },
  );

  const complete = (stationId: string) => mutation.run(
    () => apiRequest(`/camps/${selected}/stations/${stationId}`, { method: 'POST' }),
    () => {
      setNotice('Station completed.');
      status.reload();
    },
  );

  return (
    <>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p>{t.description}</p>
        </div>
        <div role="group" aria-label="Language">
          {(['EN', 'TE', 'HI'] as Language[]).map(item => (
            <button
              key={item}
              type="button"
              className="health-button"
              aria-pressed={language === item}
              onClick={() => setLanguage(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <FormError message={mutation.error} />

      {notice && !confirmation && (
        <div
          className="wf-notice"
          role="status"
          style={{ marginBottom: 16, background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}
        >
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}

      <DataState {...camps} retry={camps.reload}>
        {camps.data?.items.length ? (
          <div className="wf-record-grid">
            {camps.data.items.map(camp => {
              const isSelected = selected === camp.id;
              const isBooked = isSelected && Boolean(status.data?.slotId);
              const isRegistered = isSelected && status.data?.registered;

              return (
                <article
                  className="wf-card"
                  key={camp.id}
                  onClick={() => selectCamp(camp.id)}
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? '#4f46e5' : undefined,
                  }}
                >
                  <span className="wf-record-icon">
                    <ClipboardList size={24} />
                  </span>
                  <h3>{camp.name}</h3>
                  <p>
                    {camp.date} Ã‚Â· <MapPin size={13} style={{ verticalAlign: '-2px' }} /> {camp.location || 'Campus'}
                  </p>

                  {isBooked ? (
                    <span className="wf-status status-accepted">{t.booked}</span>
                  ) : isRegistered ? (
                    <span className="wf-status">{t.registered}</span>
                  ) : (
                    <button
                      type="button"
                      className="health-button"
                      disabled={mutation.busy}
                      onClick={event => {
                        event.stopPropagation();
                        selectCamp(camp.id);
                      }}
                    >
                      {t.chooseSlot}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={language === 'EN' ? 'No health camps published.' : language === 'TE' ? 'Ã Â°â€¡Ã Â°â€šÃ Â°â€¢Ã Â°Â¾ Ã Â°â€ Ã Â°Â°Ã Â±â€¹Ã Â°â€”Ã Â±ÂÃ Â°Â¯ Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°Â¾Ã Â°Â²Ã Â±Â Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â°Å¡Ã Â±ÂÃ Â°Â°Ã Â°Â¿Ã Â°â€šÃ Â°Å¡Ã Â°Â²Ã Â±â€¡Ã Â°Â¦Ã Â±Â.' : 'Ã Â¤â€¦Ã Â¤Â­Ã Â¥â‚¬ Ã Â¤â€¢Ã Â¥â€¹Ã Â¤Ë† Ã Â¤Â¸Ã Â¥ÂÃ Â¤ÂµÃ Â¤Â¾Ã Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¥ÂÃ Â¤Â¯ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â° Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¤â€¢Ã Â¤Â¾Ã Â¤Â¶Ã Â¤Â¿Ã Â¤Â¤ Ã Â¤Â¨Ã Â¤Â¹Ã Â¥â‚¬Ã Â¤â€š Ã Â¤Â¹Ã Â¥Ë†Ã Â¥Â¤'}
            description={language === 'EN'
              ? 'Campus health camps appear here once an administrator publishes one.'
              : language === 'TE'
                ? 'Ã Â°Â¨Ã Â°Â¿Ã Â°Â°Ã Â±ÂÃ Â°ÂµÃ Â°Â¾Ã Â°Â¹Ã Â°â€¢Ã Â±ÂÃ Â°Â¡Ã Â±Â Ã Â°Â¶Ã Â°Â¿Ã Â°Â¬Ã Â°Â¿Ã Â°Â°Ã Â°Â¾Ã Â°Â¨Ã Â±ÂÃ Â°Â¨Ã Â°Â¿ Ã Â°ÂªÃ Â±ÂÃ Â°Â°Ã Â°Å¡Ã Â±ÂÃ Â°Â°Ã Â°Â¿Ã Â°â€šÃ Â°Å¡Ã Â°Â¿Ã Â°Â¨ Ã Â°Â¤Ã Â°Â°Ã Â±ÂÃ Â°ÂµÃ Â°Â¾Ã Â°Â¤ Ã Â°â€¦Ã Â°Â¦Ã Â°Â¿ Ã Â°â€¡Ã Â°â€¢Ã Â±ÂÃ Â°â€¢Ã Â°Â¡ Ã Â°â€¢Ã Â°Â¨Ã Â°Â¿Ã Â°ÂªÃ Â°Â¿Ã Â°Â¸Ã Â±ÂÃ Â°Â¤Ã Â±ÂÃ Â°â€šÃ Â°Â¦Ã Â°Â¿.'
                : 'Ã Â¤ÂµÃ Â¥ÂÃ Â¤Â¯Ã Â¤ÂµÃ Â¤Â¸Ã Â¥ÂÃ Â¤Â¥Ã Â¤Â¾Ã Â¤ÂªÃ Â¤â€¢ Ã Â¤Â¦Ã Â¥ÂÃ Â¤ÂµÃ Â¤Â¾Ã Â¤Â°Ã Â¤Â¾ Ã Â¤Â¶Ã Â¤Â¿Ã Â¤ÂµÃ Â¤Â¿Ã Â¤Â° Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¤â€¢Ã Â¤Â¾Ã Â¤Â¶Ã Â¤Â¿Ã Â¤Â¤ Ã Â¤â€¢Ã Â¤Â°Ã Â¤Â¨Ã Â¥â€¡ Ã Â¤â€¢Ã Â¥â€¡ Ã Â¤Â¬Ã Â¤Â¾Ã Â¤Â¦ Ã Â¤ÂµÃ Â¤Â¹ Ã Â¤Â¯Ã Â¤Â¹Ã Â¤Â¾Ã Â¤Â Ã Â¤Â¦Ã Â¤Â¿Ã Â¤â€“Ã Â¤Â¾Ã Â¤Ë† Ã Â¤Â¦Ã Â¥â€¡Ã Â¤â€”Ã Â¤Â¾Ã Â¥Â¤'}
          />
        )}
      </DataState>

      {selectedCamp && (
        <section className="wf-card wf-section-gap">
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{selectedCamp.date}</span>
              <h3>{selectedCamp.name}</h3>
              <p>
                <MapPin size={14} style={{ verticalAlign: '-2px' }} /> {selectedCamp.location || 'Campus'}
              </p>
            </div>
          </div>

          <DataState {...slots} retry={slots.reload}>
            {availableSlots.length ? (
              <div className="wf-record-grid">
                {availableSlots.map(slot => {
                  const isBooked = status.data?.slotId === slot.id;
                  const isChosen = selectedSlotId === slot.id || isBooked;

                  return (
                    <button
                      type="button"
                      key={slot.id}
                      className="wf-card"
                      aria-pressed={isChosen}
                      disabled={!slot.available || Boolean(status.data?.slotId) || mutation.busy}
                      onClick={() => setSelectedSlotId(slot.id)}
                      style={{
                        textAlign: 'left',
                        cursor: slot.available ? 'pointer' : 'not-allowed',
                        opacity: slot.available ? 1 : 0.65,
                        borderColor: isChosen ? '#4f46e5' : undefined,
                      }}
                    >
                      <span className="wf-record-icon">
                        <Clock3 size={22} />
                      </span>
                      <h3>{slot.slotStart} â€“ {slot.slotEnd}</h3>
                      <p>
                        {isBooked ? t.booked : slot.available ? `${slot.remaining} ${t.available}` : t.full}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title={t.noSlots} description={t.noSlotsDescription} />
            )}
          </DataState>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button"
              className="health-button health-button-primary"
              disabled={!selectedSlotId || Boolean(status.data?.slotId) || mutation.busy}
              onClick={bookSlot}
            >
              {mutation.busy ? t.booking : t.bookSlot}
            </button>
          </div>
        </section>
      )}

      {confirmation && (
        <section className="wf-card wf-section-gap" aria-labelledby="camp-booking-confirmation">
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{t.confirmationEyebrow}</span>
              <h2 id="camp-booking-confirmation">{t.confirmationTitle}</h2>
            </div>
            <CheckCircle2 size={28} aria-hidden="true" />
          </div>

          <div className="wf-status-chart">
            <div style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{t.slot}</span>
              <strong>{confirmation.slot.slotStart} â€“ {confirmation.slot.slotEnd}</strong>
            </div>
            <div style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{t.place}</span>
              <strong>{confirmation.camp.location || 'Campus'}</strong>
            </div>
            <div style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{t.camp}</span>
              <strong>{confirmation.camp.name}</strong>
            </div>
            <div style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{t.date}</span>
              <strong>{confirmation.camp.date}</strong>
            </div>
          </div>

          <div className="wf-notice" role="note" style={{ marginTop: 16 }}>
            <ClipboardList size={18} />
            <div>
              <strong>{t.whatToBring}</strong>
              <div style={{ marginTop: 4 }}>
                {confirmation.camp.whatToBring || 'No special items listed.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              className="health-button health-button-primary"
              onClick={() => addBookingToCalendar(confirmation)}
            >
              <CalendarDays size={16} />
              {t.addToCalendar}
            </button>
            <button
              type="button"
              className="health-button"
              onClick={() => {
                setConfirmation(null);
                setSelected('');
                setSelectedSlotId('');
                setNotice('');
              }}
            >
              <ArrowLeft size={16} />
              {t.backToCamps}
            </button>
          </div>
        </section>
      )}

      {selectedCamp && status.data?.registered && !confirmation && (
        <section className="wf-card wf-section-gap">
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{selectedCamp.date}</span>
              <h3>{t.healthCampProgress}</h3>
            </div>
            {!status.data.checkedIn && (
              <button
                type="button"
                className="health-button health-button-primary"
                disabled={mutation.busy}
                onClick={checkIn}
              >
                <UserCheck size={16} />
                {t.checkIn}
              </button>
            )}
          </div>

          {status.data.checkedIn && (
            <div className="wf-notice" role="status" style={{ marginBottom: 16 }}>
              <CheckCircle2 size={18} />
              {t.checkedIn}
            </div>
          )}

          <DataState {...stations} retry={stations.reload}>
            <div className="wf-status-chart">
              {stations.data?.items.map(station => {
                const done = completed.includes(station.id);

                return (
                  <div key={station.id} style={{ gridTemplateColumns: '1fr 40px' }}>
                    <span>
                      {done ? <CheckCircle2 size={16} style={{ verticalAlign: '-3px' }} /> : null} {station.name}
                    </span>
                    <button
                      type="button"
                      className="health-button"
                      disabled={done || mutation.busy}
                      onClick={() => complete(station.id)}
                    >
                      {done ? t.done : t.complete}
                    </button>
                  </div>
                );
              })}
            </div>
          </DataState>
        </section>
      )}

      {selectedCamp && status.data?.registered && !status.data?.slotId && !confirmation && (
        <div className="wf-notice" role="status" style={{ marginTop: 16 }}>
          {t.chooseSlot}
        </div>
      )}

      {bookedSlot && !confirmation && (
        <div className="wf-notice" role="status" style={{ marginTop: 16 }}>
          <CheckCircle2 size={18} />
          {t.booked}: {bookedSlot.slotStart} â€“ {bookedSlot.slotEnd}
        </div>
      )}
    </>
  );
}
