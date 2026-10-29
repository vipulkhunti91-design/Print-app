// PrintQ Internationalization (i18n) Engine
// Supports English (en), Hindi (hi), and Gujarati (gu)

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

  // Shortcuts
  shortcut_bw_preview: string;
  shortcut_bw_desc: string;
  shortcut_deadline_check: string;
  shortcut_deadline_desc: string;
  shortcut_group_print: string;
  shortcut_group_desc: string;
  shortcut_language: string;
  shortcut_language_desc: string;

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
  settings_faqs: string;
  settings_account: string;
  settings_sign_out: string;
  settings_sign_in: string;

  // Print Settings & Preview
  print_settings_title: string;
  paper_type: string;
  paper_size: string;
  print_side: string;
  colour_mode: string;
  bw_mode: string;
  copies: string;
  pages: string;
  page_range: string;
  price_summary: string;
  total_price: string;
  continue_to_pay: string;
  preview_not_available: string;

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
    nav_alerts: "Alerts",
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

    home_greeting: "Hey Student,",
    home_subtitle: "Need to print something today?",
    home_upload_heading: "Upload your files",
    home_upload_sub: "Upload up to 4 files · Max 50 MB per file",
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
    home_active_order_banner: "You have an active print job in queue",
    home_view_order: "Track Order",

    shortcut_bw_preview: "B&W Legibility Check",
    shortcut_bw_desc: "Preview grayscale legibility & contrast",
    shortcut_deadline_check: "Deadline Estimator",
    shortcut_deadline_desc: "Check queue & pickup deadline readiness",
    shortcut_group_print: "Group Printing",
    shortcut_group_desc: "Split costs with friends & batch orders",
    shortcut_language: "Language / ભાષા / भाषा",
    shortcut_language_desc: "English · ગુજરાતી · हिन्दी",

    status_waiting: "Waiting in Queue",
    status_queued: "Queued (FIFO)",
    status_printing: "Printing Now",
    status_ready: "Ready for Pickup",
    status_completed: "Completed",
    status_cancelled: "Cancelled",

    settings_title: "Shop & Settings",
    settings_language_section: "Display Language",
    settings_language_desc: "Choose your preferred language across PrintQ",
    settings_notifications_section: "Notifications",
    settings_order_updates: "Order updates",
    settings_order_updates_sub: "Queued, printing, and pickup alerts",
    settings_shop_updates: "Print shop updates",
    settings_shop_updates_sub: "Opening hours and service notices",
    settings_faqs: "Frequently Asked Questions",
    settings_account: "Account & Profile",
    settings_sign_out: "Sign Out",
    settings_sign_in: "Sign in with Google",

    print_settings_title: "Print Settings",
    paper_type: "Paper Type",
    paper_size: "Paper Size",
    print_side: "Printing Side",
    colour_mode: "Full Colour",
    bw_mode: "Black & White",
    copies: "Copies",
    pages: "Pages",
    page_range: "Page Range",
    price_summary: "Price Breakdown",
    total_price: "Total Amount",
    continue_to_pay: "Review & Pay",
    preview_not_available: "Preview not available",

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
    home_active_order_banner: "તમારો પ્રિન્ટ ઓર્ડર કતારમાં સક્રિય છે",
    home_view_order: "ઓર્ડર ટ્રેક કરો",

    shortcut_bw_preview: "B&W વાંચનક્ષમતા ચકાસણી",
    shortcut_bw_desc: "ગ્રેસ્કેલ વાંચનક્ષમતા અને કોન્ટ્રાસ્ટ તપાસો",
    shortcut_deadline_check: "સમયમર્યાદા (Deadline) અંદાજક",
    shortcut_deadline_desc: "કતાર અને પિકઅપ સમયમર્યાદા ચકાસો",
    shortcut_group_print: "જૂથ પ્રિન્ટિંગ (Group Print)",
    shortcut_group_desc: "મિત્રો સાથે ખર્ચ વહેંચો અને સંયુક્ત ઓર્ડર કરો",
    shortcut_language: "ભાષા બદલો",
    shortcut_language_desc: "English · ગુજરાતી · हिन्दी",

    status_waiting: "કતારમાં પ્રતીક્ષારત",
    status_queued: "કતારબદ્ધ (FIFO)",
    status_printing: "પ્રિન્ટ થઈ રહ્યું છે",
    status_ready: "પિકઅપ માટે તૈયાર",
    status_completed: "સંપૂર્ણ થયેલ",
    status_cancelled: "રદ કરેલ",

    settings_title: "દુકાન અને સેટિંગ્સ",
    settings_language_section: "પ્રદર્શન ભાષા",
    settings_language_desc: "PrintQ માટે તમારી પસંદગીની ભાષા પસંદ કરો",
    settings_notifications_section: "સૂચનાઓ",
    settings_order_updates: "ઓર્ડર અપડેટ્સ",
    settings_order_updates_sub: "કતાર, પ્રિન્ટિંગ અને પિકઅપ સૂચનાઓ",
    settings_shop_updates: "દુકાન અપડેટ્સ",
    settings_shop_updates_sub: "ખુલવાનો સમય અને સેવા સૂચનાઓ",
    settings_faqs: "વારંવાર પૂછાતા પ્રશ્નો (FAQs)",
    settings_account: "ખાતું અને પ્રોફાઇલ",
    settings_sign_out: "સાઇન આઉટ",
    settings_sign_in: "Google સાથે સાઇન ઇન કરો",

    print_settings_title: "પ્રિન્ટ સેટિંગ્સ",
    paper_type: "કાગળનો પ્રકાર",
    paper_size: "કાગળનું માપ",
    print_side: "પ્રિન્ટિંગ બાજુ",
    colour_mode: "રંગીન (Colour)",
    bw_mode: "બ્લેક એન્ડ વ્હાઇટ",
    copies: "નકલો (Copies)",
    pages: "પાનાઓ",
    page_range: "પેજ શ્રેણી",
    price_summary: "કિંમત વિગતો",
    total_price: "કુલ રકમ",
    continue_to_pay: "સમીક્ષા અને ચૂકવણી",
    preview_not_available: "પૂર્વાવલોકન ઉપલબ્ધ નથી",

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
    home_active_order_banner: "आपका प्रिंट ऑर्डर कतार में सक्रिय है",
    home_view_order: "ऑर्डर ट्रैक करें",

    shortcut_bw_preview: "B&W पठनीयता जांच",
    shortcut_bw_desc: "ग्रेस्केल स्पष्टता और कंट्रास्ट देखें",
    shortcut_deadline_check: "समयसीमा (Deadline) जांच",
    shortcut_deadline_desc: "कतार और पिकअप समयसीमा की तैयारी जांचें",
    shortcut_group_print: "समूह प्रिंटिंग (Group Print)",
    shortcut_group_desc: "दोस्तों के साथ खर्च बांटें और संयुक्त ऑर्डर करें",
    shortcut_language: "भाषा बदलें",
    shortcut_language_desc: "English · ગુજરાતી · हिन्दी",

    status_waiting: "कतार में प्रतीक्षारत",
    status_queued: "कतारबद्ध (FIFO)",
    status_printing: "प्रिंट हो रहा है",
    status_ready: "पिकअप के लिए तैयार",
    status_completed: "पूर्ण",
    status_cancelled: "रद्द किया गया",

    settings_title: "शॉप और सेटिंग्स",
    settings_language_section: "प्रदर्शन भाषा",
    settings_language_desc: "PrintQ के लिए अपनी पसंदीदा भाषा चुनें",
    settings_notifications_section: "सूचनाएं",
    settings_order_updates: "ऑर्डर अपडेट्स",
    settings_order_updates_sub: "कतार, प्रिंटिंग और पिकअप सूचनाएं",
    settings_shop_updates: "दुकान अपडेट्स",
    settings_shop_updates_sub: "खुलने का समय और सेवा सूचनाएं",
    settings_faqs: "अक्सर पूछे जाने वाले प्रश्न (FAQs)",
    settings_account: "खाता और प्रोफाइल",
    settings_sign_out: "साइन आउट",
    settings_sign_in: "Google से साइन इन करें",

    print_settings_title: "प्रिंट सेटिंग्स",
    paper_type: "कागज का प्रकार",
    paper_size: "कागज का आकार",
    print_side: "प्रिंटिंग साइड",
    colour_mode: "रंगीन (Colour)",
    bw_mode: "ब्लैक एंड व्हाइट",
    copies: "प्रतियां (Copies)",
    pages: "पृष्ठ",
    page_range: "पृष्ठ श्रेणी",
    price_summary: "मूल्य विवरण",
    total_price: "कुल राशि",
    continue_to_pay: "समीक्षा और भुगतान",
    preview_not_available: "पूर्वावलोकन उपलब्ध नहीं है",

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

