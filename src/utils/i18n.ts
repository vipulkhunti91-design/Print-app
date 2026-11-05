// PrintQ Internationalization (i18n) Engine
// Supports English (en), Hindi (hi), and Gujarati (gu)

import React, { createContext, useContext, useState, useEffect } from "react";

export type SupportedLanguage = "en" | "hi" | "gu";

export const LANGUAGE_STORAGE_KEY = "printq_language_preference";

export type TranslationDictionary = {
  // Navigation Tabs
  nav_home: string;
  nav_alerts: string;
  nav_history: string;
  nav_settings: string;

  // Header & General
  app_name: string;
  back_home: string;
  back: string;
  save: string;
  cancel: string;
  confirm: string;
  close: string;
  retry: string;
  status: string;
  step_indicator: string;

  // Home Screen
  home_greeting: string;
  home_subtitle: string;
  home_upload_heading: string;
  home_upload_sub: string;
  home_upload_button: string;
  home_file_limit: string;
  home_files_count: string;
  home_eta_prompt: string;
  home_eta_prompt_sub: string;
  home_shortcuts_title: string;
  home_now_serving: string;
  home_current_serving: string;
  home_your_pickup_token: string;
  home_no_active_job: string;
  home_active_order_banner: string;
  home_view_order: string;
  home_tap_to_upload: string;
  home_or_drag_drop: string;
  home_max_reached: string;
  home_delete_room_hint: string;
  home_file_uploaded_success: string;
  home_counter_idle: string;
  home_campus_building: string;

  // Shortcuts
  shortcut_bw_preview: string;
  shortcut_bw_desc: string;
  shortcut_deadline_check: string;
  shortcut_deadline_desc: string;
  shortcut_group_print: string;
  shortcut_group_desc: string;
  shortcut_language: string;
  shortcut_language_desc: string;
  shortcut_tour: string;
  shortcut_tour_desc: string;

  // Order Statuses
  status_waiting: string;
  status_queued: string;
  status_printing: string;
  status_ready: string;
  status_completed: string;
  status_cancelled: string;

  // Settings Screen
  settings_title: string;
  settings_language_section: string;
  settings_language_desc: string;
  settings_notifications_section: string;
  settings_order_updates: string;
  settings_order_updates_sub: string;
  settings_shop_updates: string;
  settings_shop_updates_sub: string;
  settings_sound_haptics: string;
  settings_sound_haptics_sub: string;
  settings_shop_hours_card: string;
  settings_working_hours: string;
  settings_working_days: string;
  settings_weekend: string;
  settings_location: string;
  settings_printer_model: string;
  settings_printer_online: string;
  settings_contact_shop: string;
  settings_contact_sub: string;
  settings_call_helpdesk: string;
  settings_email_support: string;
  settings_default_prefs: string;
  settings_default_prefs_sub: string;
  settings_default_color: string;
  settings_default_sides: string;
  settings_default_paper: string;
  settings_auto_open: string;
  settings_auto_open_sub: string;
  settings_help_faqs: string;
  settings_data_reset: string;
  settings_clear_demo: string;
  settings_replay_tour: string;
  settings_reset_all: string;
  settings_reset_and_tour: string;
  settings_faqs: string;
  settings_account: string;
  settings_sign_out: string;
  settings_sign_in: string;

  // FAQs
  faq_q1: string;
  faq_a1: string;
  faq_q2: string;
  faq_a2: string;
  faq_q3: string;
  faq_a3: string;
  faq_q4: string;
  faq_a4: string;

  // Print Settings & Preview
  print_settings_title: string;
  step_2_of_3: string;
  paper_type: string;
  paper_size: string;
  print_side: string;
  colour_mode: string;
  bw_mode: string;
  copies: string;
  pages: string;
  page_range: string;
  page_layout: string;
  portrait: string;
  landscape: string;
  price_summary: string;
  total_price: string;
  continue_to_pay: string;
  preview_not_available: string;
  add_more_files: string;
  delete_all_files: string;
  live_queue: string;
  estimate: string;
  single_sided: string;
  double_sided: string;
  eco_friendly_note: string;
  regular_paper: string;
  rate_per_sheet: string;
  sheets_per_copy: string;
  total_uploaded_files: string;
  free: string;

  // Checkout / Review & Pay
  checkout_title: string;
  step_3_of_3: string;
  payment_method: string;
  pay_upi: string;
  pay_upi_sub: string;
  pay_cash: string;
  pay_cash_sub: string;
  instant: string;
  at_pickup: string;
  bill_breakdown: string;
  total_sheets_all: string;
  place_order_btn: string;

  // Live Token & Tracking
  pickup_token: string;
  ready_around: string;
  counter_qr: string;
  scan_at_counter: string;
  counter_scan_desc: string;
  live_print_queue_title: string;
  currently_printing: string;
  printer_idle: string;
  your_token_number: string;
  orders_ahead: string;
  orders_count: string;
  est_waiting_time: string;
  under_1_min: string;
  order_progress: string;
  fifo_active: string;
  scheduled_pickup_time: string;
  asap: string;
  set_custom_time: string;
  confirm_pickup_time: string;
  shop_closing_note: string;
  cancel_btn: string;
  order_lifecycle: string;
  stage_confirmed: string;
  stage_queued: string;
  stage_printing: string;
  stage_ready: string;
  stage_completed: string;
  ready_collection_banner: string;

  // Notifications Screen
  notifications_title: string;
  mark_all_read: string;
  no_notifications: string;
  no_notifications_desc: string;
  start_print_btn: string;

  // History Screen
  history_title: string;
  no_history: string;
  no_history_desc: string;

  // Alerts & Messages
  alert_order_confirmed: string;
  alert_order_cancelled: string;
  alert_order_ready: string;
  alert_deadline_warning: string;
  alert_deadline_met: string;
  alert_payment_success: string;
  alert_payment_failed: string;
};

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    nav_home: "Home",
    nav_alerts: "Notifications",
    nav_history: "History",
    nav_settings: "Settings",

    app_name: "PrintQ",
    back_home: "← Back to Home",
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    retry: "Retry",
    status: "Status",
    step_indicator: "Step",

    home_greeting: "Hey Student,",
    home_subtitle: "Need to print something today?",
    home_upload_heading: "Upload your files",
    home_upload_sub: "Upload up to 5 files · Max 50 MB per file",
    home_upload_button: "Upload Files",
    home_file_limit: "Max 50 MB per file",
    home_files_count: "files uploaded",
    home_eta_prompt: "Add a file to see estimated time",
    home_eta_prompt_sub: "Upload a document to calculate completion time",
    home_shortcuts_title: "PrintQ Quick Tools",
    home_now_serving: "Now Serving",
    home_current_serving: "Counter Serving Token",
    home_your_pickup_token: "Your Pickup Token",
    home_no_active_job: "No active queue tokens right now",
    home_active_order_banner: "Active Print Order",
    home_view_order: "Track Order →",
    home_tap_to_upload: "Tap to upload or browse files",
    home_or_drag_drop: "or drag and drop files here",
    home_max_reached: "Maximum 5 files reached",
    home_delete_room_hint: "Delete a file below to make room for new ones",
    home_file_uploaded_success: "File uploaded successfully",
    home_counter_idle: "Live Queue Active",
    home_campus_building: "Campus Central Building",

    shortcut_bw_preview: "B&W Legibility Check",
    shortcut_bw_desc: "Preview grayscale legibility & contrast",
    shortcut_deadline_check: "Deadline Estimator",
    shortcut_deadline_desc: "Check queue & pickup deadline readiness",
    shortcut_group_print: "Group Printing",
    shortcut_group_desc: "Split costs with friends & batch orders",
    shortcut_language: "Language / ભાષા / भाषा",
    shortcut_language_desc: "English · ગુજરાતી · हिन्दी",
    shortcut_tour: "How It Works",
    shortcut_tour_desc: "Quick tour of queue, settings and tokens",

    status_waiting: "Waiting in Queue",
    status_queued: "Queued (FIFO)",
    status_printing: "Printing Now",
    status_ready: "Ready for Pickup",
    status_completed: "Completed",
    status_cancelled: "Cancelled",

    settings_title: "Shop & Settings",
    settings_language_section: "Display Language",
    settings_language_desc: "Choose your preferred language across PrintQ",
    settings_notifications_section: "Notifications & Alerts",
    settings_order_updates: "Order Ready Alerts",
    settings_order_updates_sub: "Push alerts as soon as prints are ready for pickup",
    settings_shop_updates: "Shop Closing Warning",
    settings_shop_updates_sub: "Remind 30 mins before shop closes at 5:00 PM",
    settings_sound_haptics: "Sound & Haptics",
    settings_sound_haptics_sub: "Chime and vibration on order progress",
    settings_shop_hours_card: "Campus Central Print Shop",
    settings_working_hours: "Working Hours",
    settings_working_days: "Working Days",
    settings_weekend: "Weekend (Sat & Sun)",
    settings_location: "Location",
    settings_printer_model: "Printer Model",
    settings_printer_online: "HP Printer Online",
    settings_contact_shop: "Contact Print Shop",
    settings_contact_sub: "Questions about an order, custom binding, or campus billing?",
    settings_call_helpdesk: "📞 Call Helpdesk",
    settings_email_support: "✉ Email Support",
    settings_default_prefs: "Default Print Preferences",
    settings_default_prefs_sub: "Saved preferences applied automatically when you upload new files.",
    settings_default_color: "Default Color",
    settings_default_sides: "Default Print Sides",
    settings_default_paper: "Default Paper Size",
    settings_auto_open: "Auto-open print settings",
    settings_auto_open_sub: "Navigate directly to settings once upload finishes",
    settings_help_faqs: "Help & Guidelines",
    settings_data_reset: "Data & Reset",
    settings_clear_demo: "Clear Demo Orders",
    settings_replay_tour: "Replay Onboarding Tour",
    settings_reset_all: "Reset All App Data",
    settings_reset_and_tour: "Reset App & Replay Tour",
    settings_faqs: "Frequently Asked Questions",
    settings_account: "Account & Profile",
    settings_sign_out: "Sign Out",
    settings_sign_in: "Sign In / Register",

    faq_q1: "How do I collect my order?",
    faq_a1: "Show your assigned pickup token (e.g. L-30) at the Campus Central counter. No physical slip or printout is needed.",
    faq_q2: "Which file formats and sizes are supported?",
    faq_a2: "We accept PDF, DOCX, PPTX, JPG, and PNG files up to 50 MB per file, with up to 5 files per batch.",
    faq_q3: "What happens if I place an order after hours?",
    faq_a3: "Orders submitted after 5:00 PM or on weekends are safely saved in the queue and printed first thing the next working morning at 9:30 AM.",
    faq_q4: "Can I cancel a print order?",
    faq_a4: "You can cancel any queued order directly from the tracking screen before printing begins.",

    print_settings_title: "Print Settings",
    step_2_of_3: "Step 2/3",
    paper_type: "Paper Type",
    paper_size: "Paper Size",
    print_side: "Printing Side",
    colour_mode: "Print Option",
    bw_mode: "Black & White",
    copies: "Number of Copies",
    pages: "Pages",
    page_range: "Page Range",
    page_layout: "Page Layout",
    portrait: "Portrait",
    landscape: "Landscape",
    price_summary: "Price Summary",
    total_price: "Total Amount",
    continue_to_pay: "Review & Pay",
    preview_not_available: "Preview not available",
    add_more_files: "Add More Files",
    delete_all_files: "Delete All Files",
    live_queue: "Live Queue",
    estimate: "Estimate",
    single_sided: "Single-Sided",
    double_sided: "Double-Sided",
    eco_friendly_note: "Save paper by printing on both sides of each sheet (Eco-Friendly).",
    regular_paper: "Regular Paper",
    rate_per_sheet: "Rate per sheet:",
    sheets_per_copy: "Sheets per copy:",
    total_uploaded_files: "Total uploaded files:",
    free: "Free",

    checkout_title: "Review & Pay",
    step_3_of_3: "Step 3/3",
    payment_method: "Payment Method",
    pay_upi: "Pay via UPI / QR",
    pay_upi_sub: "Google Pay, PhonePe, Paytm, BHIM",
    pay_cash: "Pay Cash at Counter",
    pay_cash_sub: "Pay when collecting verified prints",
    instant: "Instant",
    at_pickup: "At pickup",
    bill_breakdown: "Bill Breakdown",
    total_sheets_all: "Total Sheets (All Files)",
    place_order_btn: "Place Order & Get Pickup Token",

    pickup_token: "PICKUP TOKEN",
    ready_around: "Ready around",
    counter_qr: "COUNTER VERIFICATION QR",
    scan_at_counter: "Scan at Central Counter",
    counter_scan_desc: "Staff will scan this QR to instantly hand over verified prints for token",
    live_print_queue_title: "Live Print Queue Status",
    currently_printing: "Currently Printing",
    printer_idle: "None (Printer Ready)",
    your_token_number: "Your Token Number",
    orders_ahead: "Orders Ahead of You",
    orders_count: "orders ahead",
    est_waiting_time: "Est. Waiting Time",
    under_1_min: "Under 1 minute",
    order_progress: "Current Order Progress",
    fifo_active: "Live Queue",
    scheduled_pickup_time: "Scheduled Pickup Time",
    asap: "⚡ Right Now",
    set_custom_time: "Set Custom Pickup Time",
    confirm_pickup_time: "Confirm Pickup for",
    shop_closing_note: "Campus Central Desk open 9:30 AM – 5:00 PM",
    cancel_btn: "Cancel",
    order_lifecycle: "Order Life Cycle",
    stage_confirmed: "Order Confirmed",
    stage_queued: "Queued (FIFO)",
    stage_printing: "Printing",
    stage_ready: "Ready for Pickup",
    stage_completed: "Completed",
    ready_collection_banner: "Ready for Collection Now!",

    notifications_title: "Notifications",
    mark_all_read: "Mark all as read",
    no_notifications: "No Notifications Yet",
    no_notifications_desc: "You will receive real-time updates here about your print queue, order confirmation, and pickup reminders.",
    start_print_btn: "Start a Print Order →",

    history_title: "Order History",
    no_history: "No Print Orders Yet",
    no_history_desc: "Upload your lecture notes, assignments, or resumes to get started.",

    alert_order_confirmed: "Order confirmed and added to queue",
    alert_order_cancelled: "Order cancelled successfully",
    alert_order_ready: "Your document is ready for collection at counter",
    alert_deadline_warning: "Tight deadline: may require priority or earlier pickup",
    alert_deadline_met: "Estimated to complete comfortably before deadline",
    alert_payment_success: "Payment verified successfully",
    alert_payment_failed: "Payment failed or was cancelled",
  },
  gu: {
    nav_home: "હોમ",
    nav_alerts: "સૂચનાઓ",
    nav_history: "ઇતિહાસ",
    nav_settings: "સેટિંગ્સ",

    app_name: "પ્રિન્ટક્યૂ",
    back_home: "← હોમ પર પાછા જાઓ",
    back: "પાછળ",
    save: "સાચવો",
    cancel: "રદ કરો",
    confirm: "ખાતરી કરો",
    close: "બંધ કરો",
    retry: "ફરી પ્રયાસ કરો",
    status: "સ્થિતિ",
    step_indicator: "પગલું",

    home_greeting: "નમસ્તે વિદ્યાર્થી,",
    home_subtitle: "આજે કંઈ પ્રિન્ટ કરાવવું છે?",
    home_upload_heading: "તમારી ફાઇલો અપલોડ કરો",
    home_upload_sub: "મહત્તમ ૫ ફાઇલો · ફાઇલ દીઠ મહત્તમ ૫૦ MB",
    home_upload_button: "ફાઇલો અપલોડ કરો",
    home_file_limit: "ફાઇલ દીઠ મહત્તમ ૫૦ MB",
    home_files_count: "ફાઇલો અપલોડ થઈ",
    home_eta_prompt: "અંદાજિત સમય જોવા ફાઇલ ઉમેરો",
    home_eta_prompt_sub: "પ્રિન્ટિંગ સમય ગણવા માટે દસ્તાવેજ અપલોડ કરો",
    home_shortcuts_title: "પ્રિન્ટક્યૂ ઝડપી ટૂલ્સ",
    home_now_serving: "હાલમાં સર્વિંગ",
    home_current_serving: "કાઉન્ટર પર ચાલતો ટોકન",
    home_your_pickup_token: "તમારો પિકઅપ ટોકન",
    home_no_active_job: "હાલમાં કોઈ સક્રિય કતાર ટોકન નથી",
    home_active_order_banner: "સક્રિય પ્રિન્ટ ઓર્ડર",
    home_view_order: "ઓર્ડર ટ્રેક કરો →",
    home_tap_to_upload: "ફાઇલો અપલોડ કરવા ટેપ કરો અથવા બ્રાઉઝ કરો",
    home_or_drag_drop: "અથવા ફાઇલો અહીં ખેંચો અને છોડો",
    home_max_reached: "મહત્તમ ૫ ફાઇલો પહોંચી ગઈ",
    home_delete_room_hint: "નવી ફાઇલ માટે નીચેથી ફાઇલ ડિલીટ કરો",
    home_file_uploaded_success: "ફાઇલ સફળતાપૂર્વક અપલોડ થઈ",
    home_counter_idle: "પ્રિન્ટર ચાલુ છે · કતાર સક્રિય",
    home_campus_building: "કેમ્પસ સેન્ટ્રલ બિલ્ડિંગ",

    shortcut_bw_preview: "B&W વાંચનક્ષમતા ચકાસણી",
    shortcut_bw_desc: "ગ્રેસ્કેલ વાંચનક્ષમતા અને કોન્ટ્રાસ્ટ તપાસો",
    shortcut_deadline_check: "સમયમર્યાદા (Deadline) અંદાજક",
    shortcut_deadline_desc: "કતાર અને પિકઅપ સમયમર્યાદા ચકાસો",
    shortcut_group_print: "જૂથ પ્રિન્ટિંગ (Group Print)",
    shortcut_group_desc: "મિત્રો સાથે ખર્ચ વહેંચો અને સંયુક્ત ઓર્ડર કરો",
    shortcut_language: "ભાષા બદલો",
    shortcut_language_desc: "English · ગુજરાતી · हिन्दी",
    shortcut_tour: "કેવી રીતે કામ કરે છે",
    shortcut_tour_desc: "ટોકન, કતાર અને સેટિંગ્સની ગાઇડ",

    status_waiting: "કતારમાં પ્રતીક્ષારત",
    status_queued: "કતારબદ્ધ (FIFO)",
    status_printing: "પ્રિન્ટ થઈ રહ્યું છે",
    status_ready: "પિકઅપ માટે તૈયાર",
    status_completed: "સંપૂર્ણ થયેલ",
    status_cancelled: "રદ કરેલ",

    settings_title: "દુકાન અને સેટિંગ્સ",
    settings_language_section: "પ્રદર્શન ભાષા (Display Language)",
    settings_language_desc: "PrintQ માટે તમારી પસંદગીની ભાષા પસંદ કરો",
    settings_notifications_section: "સૂચનાઓ અને ચેતવણીઓ",
    settings_order_updates: "ઓર્ડર પિકઅપ ચેતવણીઓ",
    settings_order_updates_sub: "પ્રિન્ટ તૈયાર થતાં જ ત્વરિત સૂચના મેળવો",
    settings_shop_updates: "દુકાન બંધ થવાની ચેતવણી",
    settings_shop_updates_sub: "સાંજે ૫:૦૦ વાગ્યે દુકાન બંધ થવાના ૩૦ મિનિટ પહેલાં યાદ અપાવો",
    settings_sound_haptics: "અવાજ અને વાઇબ્રેશન",
    settings_sound_haptics_sub: "ઓર્ડર પ્રગતિ વખતે અવાજ અને કંપન",
    settings_shop_hours_card: "કેમ્પસ સેન્ટ્રલ પ્રિન્ટ શોપ",
    settings_working_hours: "કામકાજનો સમય",
    settings_working_days: "કામકાજના દિવસો",
    settings_weekend: "સપ્તાહનો અંત (શનિ અને રવિ)",
    settings_location: "સ્થળ",
    settings_printer_model: "પ્રિન્ટર મોડેલ",
    settings_printer_online: "HP પ્રિન્ટર ઓનલાઇન",
    settings_contact_shop: "પ્રિન્ટ શોપનો સંપર્ક કરો",
    settings_contact_sub: "ઓર્ડર, વિશેષ બાઇન્ડિંગ અથવા બિલિંગ સંબંધિત પ્રશ્નો?",
    settings_call_helpdesk: "📞 હેલ્પડેસ્ક પર કૉલ કરો",
    settings_email_support: "✉ ઇમેઇલ સપોર્ટ",
    settings_default_prefs: "મૂળભૂત પ્રિન્ટ પસંદગીઓ",
    settings_default_prefs_sub: "નવી ફાઇલ અપલોડ કરતી વખતે આપમેળે લાગુ થતી સેટિંગ્સ.",
    settings_default_color: "ડિફોલ્ટ રંગ",
    settings_default_sides: "ડિફોલ્ટ બાજુઓ",
    settings_default_paper: "ડિફોલ્ટ કાગળ સાઇઝ",
    settings_auto_open: "સેટિંગ્સ આપમેળે ખોલો",
    settings_auto_open_sub: "અપલોડ પૂર્ણ થતાં સીધા સેટિંગ્સ પર જાઓ",
    settings_help_faqs: "મદદ અને માર્ગદર્શિકા (FAQs)",
    settings_data_reset: "ડેટા અને રીસેટ",
    settings_clear_demo: "ડેમો ઓર્ડર સાફ કરો",
    settings_replay_tour: "ગાઇડ ફરીથી જુઓ",
    settings_reset_all: "બધો એપ ડેટા રીસેટ કરો",
    settings_reset_and_tour: "એપ રીસેટ કરો અને ટૂર ફરી જુઓ",
        settings_faqs: "વારંવાર પૂછાતા પ્રશ્નો (FAQs)",
    settings_account: "ખાતું અને પ્રોફાઇલ",
    settings_sign_out: "સાઇન આઉટ",
    settings_sign_in: "સાઇન ઇન / રજીસ્ટર કરો",

    faq_q1: "હું મારો ઓર્ડર કેવી રીતે મેળવી શકું?",
    faq_a1: "કેમ્પસ સેન્ટ્રલ કાઉન્ટર પર તમારો સોંપેલ પિકઅપ ટોકન (જેમ કે L-30) બતાવો. કોઈ કાગળની રસીદની જરૂર નથી.",
    faq_q2: "કયા ફાઇલ ફોર્મેટ અને સાઇઝ સપોર્ટેડ છે?",
    faq_a2: "અમે ફાઇલ દીઠ ૫૦ MB સુધીની PDF, DOCX, PPTX, JPG અને PNG ફાઇલો સ્વીકારીએ છીએ (બેચ દીઠ મહત્તમ ૫ ફાઇલો).",
    faq_q3: "જો હું સમય પછી ઓર્ડર આપું તો શું થશે?",
    faq_a3: "સાંજે ૫:૦૦ વાગ્યા પછી અથવા રવિવારે આપેલા ઓર્ડર કતારમાં સુરક્ષિત રહે છે અને પછીના કામકાજના દિવસે સવારે ૯:૩૦ વાગ્યે પહેલા પ્રિન્ટ થાય છે.",
    faq_q4: "શું હું પ્રિન્ટ ઓર્ડર રદ કરી શકું?",
    faq_a4: "પ્રિન્ટિંગ શરૂ થાય તે પહેલાં તમે ટ્રેકિંગ સ્ક્રીન પરથી કતારબદ્ધ ઓર્ડર સીધો રદ કરી શકો છો.",

    print_settings_title: "પ્રિન્ટ સેટિંગ્સ",
    step_2_of_3: "પગલું ૨/૩",
    paper_type: "કાગળનો પ્રકાર",
    paper_size: "કાગળનું માપ",
    print_side: "પ્રિન્ટિંગ બાજુ",
    colour_mode: "પ્રિન્ટ વિકલ્પ",
    bw_mode: "બ્લેક એન્ડ વ્હાઇટ",
    copies: "નકલોની સંખ્યા (Copies)",
    pages: "પાનાઓ",
    page_range: "પેજ શ્રેણી",
    page_layout: "પેજ લેઆઉટ",
    portrait: "પોર્ટ્રેટ (ઊભું)",
    landscape: "લેન્ડસ્કેપ (આડું)",
    price_summary: "કિંમત વિગતો (Price Summary)",
    total_price: "કુલ રકમ",
    continue_to_pay: "સમીક્ષા અને ચૂકવણી",
    preview_not_available: "પૂર્વાવલોકન ઉપલબ્ધ નથી",
    add_more_files: "વધુ ફાઇલો ઉમેરો",
    delete_all_files: "બધી ફાઇલો કાઢી નાખો",
    live_queue: "લાઇવ કતાર",
    estimate: "અંદાજ",
    single_sided: "એક બાજુ (Single-Sided)",
    double_sided: "બંને બાજુ (Double-Sided)",
    eco_friendly_note: "દરેક શીટની બંને બાજુ પ્રિન્ટ કરીને કાગળ બચાવો (ઇકો-ફ્રેન્ડલી).",
    regular_paper: "સામાન્ય કાગળ (Regular Paper)",
    rate_per_sheet: "શીટ દીઠ દર:",
    sheets_per_copy: "નકલ દીઠ શીટ્સ:",
    total_uploaded_files: "કુલ અપલોડ કરેલ ફાઇલો:",
    free: "મફત (Free)",

    checkout_title: "સમીક્ષા અને ચૂકવણી",
    step_3_of_3: "પગલું ૩/૩",
    payment_method: "ચુકવણી પદ્ધતિ (Payment Method)",
    pay_upi: "UPI / QR દ્વારા ચૂકવો",
    pay_upi_sub: "Google Pay, PhonePe, Paytm, BHIM",
    pay_cash: "કાઉન્ટર પર રોકડ ચૂકવો",
    pay_cash_sub: "ચકાસેલ પ્રિન્ટ મેળવતી વખતે ચૂકવો",
    instant: "ત્વરિત",
    at_pickup: "પિકઅપ સમયે",
    bill_breakdown: "બિલ વિગત (Bill Breakdown)",
    total_sheets_all: "કુલ શીટ્સ (બધી ફાઇલો)",
    place_order_btn: "ઓર્ડર આપો અને પિકઅપ ટોકન મેળવો",

    pickup_token: "પિકઅપ ટોકન (PICKUP TOKEN)",
    ready_around: "આશરે તૈયાર થશે",
    counter_qr: "કાઉન્ટર વેરિફિકેશન QR",
    scan_at_counter: "સેન્ટ્રલ કાઉન્ટર પર સ્કેન કરો",
    counter_scan_desc: "સ્ટાફ આ QR સ્કેન કરીને પ્રિન્ટ તરત સોંપશે ટોકન",
    live_print_queue_title: "લાઇવ પ્રિન્ટ કતાર સ્થિતિ (Live Print Queue)",
    currently_printing: "હાલમાં પ્રિન્ટ થઈ રહ્યું છે",
    printer_idle: "કોઈ નહીં (પ્રિન્ટર તૈયાર છે)",
    your_token_number: "તમારો ટોકન નંબર",
    orders_ahead: "આગળના ઓર્ડર્સ",
    orders_count: "ઓર્ડર્સ આગળ છે",
    est_waiting_time: "અંદાજિત પ્રતીક્ષા સમય",
    under_1_min: "૧ મિનિટ કરતાં ઓછો",
    order_progress: "વર્તમાન ઓર્ડર પ્રગતિ",
    fifo_active: "લાઇવ કતાર",
    scheduled_pickup_time: "નિર્ધારિત પિકઅપ સમય",
    asap: "⚡ અત્યારે જ (Right Now)",
    set_custom_time: "કસ્ટમ પિકઅપ સમય પસંદ કરો",
    confirm_pickup_time: "આ સમય માટે પિકઅપ સેટ કરો",
    shop_closing_note: "કેમ્પસ સેન્ટ્રલ ડેસ્ક સવારે ૯:૩૦ થી સાંજે ૫:૦૦ સુધી ખુલ્લું છે",
    cancel_btn: "રદ કરો",
        order_lifecycle: "ઓર્ડર જીવનચક્ર (Order Life Cycle)",
    stage_confirmed: "ઓર્ડર પુષ્ટિ થયો",
    stage_queued: "કતારબદ્ધ (FIFO)",
    stage_printing: "પ્રિન્ટિંગ ચાલુ છે",
    stage_ready: "પિકઅપ માટે તૈયાર",
    stage_completed: "સંપૂર્ણ થયેલ",
    ready_collection_banner: "હવે સંગ્રહ માટે તૈયાર છે!",

    notifications_title: "સૂચનાઓ (Notifications)",
    mark_all_read: "બધા વાંચેલા તરીકે ચિહ્નિત કરો",
    no_notifications: "હજી સુધી કોઈ સૂચના નથી",
    no_notifications_desc: "તમને અહીં પ્રિન્ટ કતાર, ઓર્ડર પુષ્ટિ અને પિકઅપ રીમાઇન્ડર્સ વિશે રીઅલ-ટાઇમ અપડેટ્સ મળશે.",
    start_print_btn: "પ્રિન્ટ ઓર્ડર શરૂ કરો →",

    history_title: "ઓર્ડર ઇતિહાસ (Order History)",
    no_history: "હજી સુધી કોઈ પ્રિન્ટ ઓર્ડર નથી",
    no_history_desc: "શરૂ કરવા માટે તમારી લેક્ચર નોટ્સ, અસાઇનમેન્ટ્સ અથવા રિઝ્યુમે અપલોડ કરો.",

    alert_order_confirmed: "ઓર્ડર પુષ્ટિ થયો અને કતારમાં ઉમેરાયો",
    alert_order_cancelled: "ઓર્ડર સફળતાપૂર્વક રદ કરવામાં આવ્યો",
    alert_order_ready: "તમારો દસ્તાવેજ કાઉન્ટર પર સંગ્રહ માટે તૈયાર છે",
    alert_deadline_warning: "ઓછો સમય: અગાઉથી ઓર્ડર આપવો જરૂરી હોઈ શકે છે",
    alert_deadline_met: "સમયમર્યાદા પહેલાં પ્રિન્ટ પૂર્ણ થવાનો અંદાજ છે",
    alert_payment_success: "ચુકવણી સફળતાપૂર્વક ચકાસાયેલ છે",
    alert_payment_failed: "ચુકવણી નિષ્ફળ ગઈ અથવા રદ થઈ",
  },
  hi: {
    nav_home: "होम",
    nav_alerts: "सूचनाएं",
    nav_history: "इतिहास",
    nav_settings: "सेटिंग्स",

    app_name: "प्रिंटक्यू",
    back_home: "← होम पर वापस जाएं",
    back: "वापस",
    save: "सहेजें",
    cancel: "रद्द करें",
    confirm: "पुष्टि करें",
    close: "बंद करें",
    retry: "पुनः प्रयास करें",
    status: "स्थिति",
    step_indicator: "चरण",

    home_greeting: "नमस्ते विद्यार्थी,",
    home_subtitle: "आज कुछ प्रिंट करवाना है?",
    home_upload_heading: "अपनी फाइलें अपलोड करें",
    home_upload_sub: "अधिकतम 5 फाइलें · प्रति फाइल अधिकतम 50 MB",
    home_upload_button: "फाइलें अपलोड करें",
    home_file_limit: "प्रति फाइल अधिकतम 50 MB",
    home_files_count: "फाइलें अपलोड हुईं",
    home_eta_prompt: "अनुमानित समय देखने के लिए फाइल जोड़ें",
    home_eta_prompt_sub: "प्रिंटिंग समय की गणना के लिए दस्तावेज अपलोड करें",
    home_shortcuts_title: "प्रिंटक्यू त्वरित टूल्स",
    home_now_serving: "वर्तमान सेवा (Now Serving)",
    home_current_serving: "काउंटर पर वर्तमान टोकन",
    home_your_pickup_token: "आपका पिकअप टोकन",
    home_no_active_job: "वर्तमान में कतार में कोई सक्रिय टोकन नहीं",
    home_active_order_banner: "सक्रिय प्रिंट ऑर्डर",
    home_view_order: "ऑर्डर ट्रैक करें →",
    home_tap_to_upload: "फाइलें अपलोड करने के लिए टैप या ब्राउज़ करें",
    home_or_drag_drop: "या फाइलें यहाँ खींचें और छोड़ें",
    home_max_reached: "अधिकतम 5 फाइलें पूर्ण हुईं",
    home_delete_room_hint: "नई फाइलों के लिए नीचे से एक फाइल हटाएं",
    home_file_uploaded_success: "फाइल सफलतापूर्वक अपलोड हुई",
    home_counter_idle: "प्रिंटर चालू है · लाइव कतार",
    home_campus_building: "कैंपस सेंट्रल बिल्डिंग",

    shortcut_bw_preview: "B&W पठनीयता जांच",
    shortcut_bw_desc: "ग्रेस्केल स्पष्टता और कंट्रास्ट देखें",
    shortcut_deadline_check: "समयसीमा (Deadline) जांच",
    shortcut_deadline_desc: "कतार और पिकअप समयसीमा की तैयारी जांचें",
    shortcut_group_print: "समूह प्रिंटिंग (Group Print)",
    shortcut_group_desc: "दोस्तों के साथ खर्च बांटें और संयुक्त ऑर्डर करें",
    shortcut_language: "भाषा बदलें",
    shortcut_language_desc: "English · ગુજરાતી · हिन्दी",
    shortcut_tour: "यह कैसे काम करता है",
    shortcut_tour_desc: "टोकन, कतार और सेटिंग्स गाइड",

    status_waiting: "कतार में प्रतीक्षारत",
    status_queued: "कतारबद्ध (FIFO)",
    status_printing: "प्रिंट हो रहा है",
    status_ready: "पिकअप के लिए तैयार",
    status_completed: "पूर्ण",
    status_cancelled: "रद्द किया गया",

    settings_title: "शॉप और सेटिंग्स",
    settings_language_section: "प्रदर्शन भाषा (Display Language)",
    settings_language_desc: "PrintQ के लिए अपनी पसंदीदा भाषा चुनें",
    settings_notifications_section: "सूचनाएं और अलर्ट",
    settings_order_updates: "ऑर्डर पिकअप अलर्ट",
    settings_order_updates_sub: "प्रिंट तैयार होते ही तुरंत सूचना प्राप्त करें",
    settings_shop_updates: "दुकान बंद होने की चेतावनी",
    settings_shop_updates_sub: "शाम 5:00 बजे दुकान बंद होने से 30 मिनट पहले याद दिलाएं",
    settings_sound_haptics: "ध्वनि और कंपन",
    settings_sound_haptics_sub: "ऑर्डर प्रगति पर घंटी और कंपन",
    settings_shop_hours_card: "कैंपस सेंट्रल प्रिंट शॉप",
    settings_working_hours: "कार्य समय",
    settings_working_days: "कार्य दिवस",
    settings_weekend: "सप्ताहांत (शनि व रवि)",
    settings_location: "स्थान",
    settings_printer_model: "प्रिंटर मॉडल",
    settings_printer_online: "HP प्रिंटर ऑनलाइन",
    settings_contact_shop: "प्रिंट शॉप से संपर्क करें",
    settings_contact_sub: "ऑर्डर, कस्टम बाइंडिंग या बिलिंग संबंधी कोई प्रश्न?",
    settings_call_helpdesk: "📞 हेल्पडेस्क पर कॉल करें",
    settings_email_support: "✉ ईमेल सहायता",
    settings_default_prefs: "डिफ़ॉल्ट प्रिंट प्राथमिकताएं",
    settings_default_prefs_sub: "नई फाइल अपलोड करते समय स्वचालित रूप से लागू होने वाली सेटिंग्स।",
    settings_default_color: "डिफ़ॉल्ट रंग",
    settings_default_sides: "डिफ़ॉल्ट प्रिंटिंग साइड",
    settings_default_paper: "डिफ़ॉल्ट पेपर साइज",
    settings_auto_open: "सेटिंग्स स्वतः खोलें",
    settings_auto_open_sub: "अपलोड पूरा होने पर सीधे सेटिंग्स पर जाएं",
    settings_help_faqs: "सहायता और अक्सर पूछे जाने वाले प्रश्न (FAQs)",
    settings_data_reset: "डेटा और रीसेट",
    settings_clear_demo: "डेमो ऑर्डर हटाएं",
    settings_replay_tour: "गाइड पुनः देखें",
    settings_reset_all: "सारा ऐप डेटा रीसेट करें",
    settings_reset_and_tour: "ऐप रीसेट करें और टूर दोबारा देखें",
        settings_faqs: "अक्सर पूछे जाने वाले प्रश्न (FAQs)",
    settings_account: "खाता और प्रोफाइल",
    settings_sign_out: "साइन आउट",
    settings_sign_in: "साइन इन / रजिस्टर करें",

    faq_q1: "मैं अपना ऑर्डर कैसे प्राप्त करूं?",
    faq_a1: "कैंपस सेंट्रल काउंटर पर अपना असाइन किया गया पिकअप टोकन (जैसे L-30) दिखाएं। किसी फिजिकल रसीद की आवश्यकता नहीं है।",
    faq_q2: "कौन से फाइल प्रारूप और आकार समर्थित हैं?",
    faq_a2: "हम प्रति फाइल 50 MB तक PDF, DOCX, PPTX, JPG और PNG फाइलें स्वीकार करते हैं (प्रति बैच अधिकतम 5 फाइलें)।",
    faq_q3: "यदि मैं समय के बाद ऑर्डर देता हूं तो क्या होगा?",
    faq_a3: "शाम 5:00 बजे के बाद या सप्ताहांत पर दिए गए ऑर्डर कतार में सुरक्षित रहते हैं और अगले कार्य दिवस सुबह 9:30 बजे सबसे पहले प्रिंट होते हैं।",
    faq_q4: "क्या मैं प्रिंट ऑर्डर रद्द कर सकता हूं?",
    faq_a4: "प्रिंटिंग शुरू होने से पहले आप ट्रैकिंग स्क्रीन से कतारबद्ध ऑर्डर सीधे रद्द कर सकते हैं।",

    print_settings_title: "प्रिंट सेटिंग्स",
    step_2_of_3: "चरण 2/3",
    paper_type: "कागज का प्रकार",
    paper_size: "कागज का आकार",
    print_side: "प्रिंटिंग साइड",
    colour_mode: "प्रिंट विकल्प",
    bw_mode: "ब्लैक एंड व्हाइट",
    copies: "प्रतियों की संख्या (Copies)",
    pages: "पृष्ठ",
    page_range: "पृष्ठ श्रेणी",
    page_layout: "पेज लेआउट",
    portrait: "पोर्ट्रेट (खड़ा)",
    landscape: "लैंडस्केप (आड़ा)",
    price_summary: "मूल्य विवरण (Price Summary)",
    total_price: "कुल राशि",
    continue_to_pay: "समीक्षा और भुगतान",
    preview_not_available: "पूर्वावलोकन उपलब्ध नहीं है",
    add_more_files: "और फाइलें जोड़ें",
    delete_all_files: "सभी फाइलें हटाएं",
    live_queue: "लाइव कतार",
    estimate: "अनुमान",
    single_sided: "एक तरफ (Single-Sided)",
    double_sided: "दोनों तरफ (Double-Sided)",
    eco_friendly_note: "प्रत्येक शीट के दोनों तरफ प्रिंट करके कागज बचाएं (पर्यावरण अनुकूल)।",
    regular_paper: "साधारण कागज (Regular Paper)",
    rate_per_sheet: "प्रति शीट दर:",
    sheets_per_copy: "प्रति प्रति शीट्स:",
    total_uploaded_files: "कुल अपलोड की गई फाइलें:",
    free: "मुफ्त (Free)",

    checkout_title: "समीक्षा और भुगतान",
    step_3_of_3: "चरण 3/3",
    payment_method: "भुगतान विधि (Payment Method)",
    pay_upi: "UPI / QR द्वारा भुगतान करें",
    pay_upi_sub: "Google Pay, PhonePe, Paytm, BHIM",
    pay_cash: "काउंटर पर नकद भुगतान करें",
    pay_cash_sub: "सत्यापित प्रिंट प्राप्त करते समय भुगतान करें",
    instant: "त्वरित",
    at_pickup: "पिकअप के समय",
    bill_breakdown: "बिल विवरण (Bill Breakdown)",
    total_sheets_all: "कुल शीट्स (सभी फाइलें)",
    place_order_btn: "ऑर्डर दें और पिकअप टोकन प्राप्त करें",

    pickup_token: "पिकअप टोकन (PICKUP TOKEN)",
    ready_around: "लगभग तैयार होगा",
    counter_qr: "काउंटर सत्यापन QR",
    scan_at_counter: "सेंट्रल काउंटर पर स्कैन करें",
    counter_scan_desc: "स्टाफ इस QR को स्कैन करके प्रिंट तुरंत सौंपेगा टोकन",
    live_print_queue_title: "लाइव प्रिंट कतार स्थिति (Live Print Queue)",
    currently_printing: "वर्तमान में प्रिंट हो रहा है",
    printer_idle: "कोई नहीं (प्रिंटर तैयार है)",
    your_token_number: "आपका टोकन नंबर",
    orders_ahead: "आगे के ऑर्डर",
    orders_count: "ऑर्डर आगे हैं",
    est_waiting_time: "अनुमानित प्रतीक्षा समय",
    under_1_min: "1 मिनट से कम",
    order_progress: "वर्तमान ऑर्डर प्रगति",
    fifo_active: "लाइव कतार",
    scheduled_pickup_time: "निर्धारित पिकअप समय",
    asap: "⚡ अभी चाहिए (Right Now)",
    set_custom_time: "कस्टम पिकअप समय चुनें",
    confirm_pickup_time: "इस समय के लिए पिकअप सेट करें",
    shop_closing_note: "कैंपस सेंट्रल डेस्क सुबह 9:30 से शाम 5:00 तक खुला है",
    cancel_btn: "रद्द करें",
        order_lifecycle: "ऑर्डर जीवनचक्र (Order Life Cycle)",
    stage_confirmed: "ऑर्डर की पुष्टि हुई",
    stage_queued: "कतारबद्ध (FIFO)",
    stage_printing: "प्रिंटिंग जारी है",
    stage_ready: "पिकअप के लिए तैयार",
    stage_completed: "पूर्ण",
    ready_collection_banner: "अब संग्रह के लिए तैयार है!",

    notifications_title: "सूचनाएं (Notifications)",
    mark_all_read: "सभी पढ़े गए के रूप में चिह्नित करें",
    no_notifications: "अभी कोई सूचना नहीं है",
    no_notifications_desc: "आपको यहाँ प्रिंट कतार, ऑर्डर पुष्टि और पिकअप रिमाइंडर के बारे में रीयल-टाइम अपडेट प्राप्त होंगे।",
    start_print_btn: "प्रिंट ऑर्डर शुरू करें →",

    history_title: "ऑर्डर इतिहास (Order History)",
    no_history: "अभी कोई प्रिंट ऑर्डर नहीं है",
    no_history_desc: "शुरू करने के लिए अपने लेक्चर नोट्स, असाइनमेंट या रिज्यूमे अपलोड करें।",

    alert_order_confirmed: "ऑर्डर की पुष्टि हुई और कतार में जोड़ा गया",
    alert_order_cancelled: "ऑर्डर सफलतापूर्वक रद्द कर दिया गया",
    alert_order_ready: "आपका दस्तावेज काउंटर पर संग्रह के लिए तैयार है",
    alert_deadline_warning: "तंग समयसीमा: प्राथमिकता या पहले ऑर्डर की आवश्यकता हो सकती है",
    alert_deadline_met: "समयसीमा से पहले प्रिंट पूरा होने का अनुमान है",
    alert_payment_success: "भुगतान सफलतापूर्वक सत्यापित हुआ",
    alert_payment_failed: "भुगतान विफल या रद्द हुआ",
  },
};

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "gu" || saved === "hi" || saved === "en") {
      return saved;
    }
  } catch {
    // Local storage access error fallback
  }
  return "en";
}

export function saveStoredLanguage(lang: SupportedLanguage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Local storage access error
  }
}

export function getTranslation(lang: SupportedLanguage, key: keyof TranslationDictionary): string {
  return translations[lang]?.[key] || translations.en[key] || "";
}

// React Context for seamless i18n access across all child components
interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof TranslationDictionary) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => getTranslation("en", key),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode; initialLanguage?: SupportedLanguage }> = ({
  children,
  initialLanguage,
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => initialLanguage || getStoredLanguage());

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    saveStoredLanguage(lang);
  };

  const t = (key: keyof TranslationDictionary): string => {
    return getTranslation(language, key);
  };

  return React.createElement(LanguageContext.Provider, { value: { language, setLanguage, t } }, children);
};

export const useLanguage = () => useContext(LanguageContext);
