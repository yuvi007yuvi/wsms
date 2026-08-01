import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
const resources = {
  en: {
    translation: {
      "Dashboard": "Dashboard",
      "Weighment": "Weighment",
      "Vehicles": "Vehicles",
      "Materials": "Materials",
      "Sources": "Sources",
      "Destinations": "Destinations",
      "Slip History": "Slip History",
      "Users": "Users",
      "Settings": "Settings",
      
      "NATURE GREEN": "NATURE GREEN",
      "Designed & Developed by": "Designed & Developed by",
      
      "Weighbridge Connected": "Weighbridge Connected",
      "Weighbridge Disconnected": "Weighbridge Disconnected",
      
      // Dashboard
      "Overview": "Overview",
      "Live operational metrics and weighment statistics.": "Live operational metrics and weighment statistics.",
      "Refresh": "Refresh",
      "Total Slips Today": "Total Slips Today",
      "Generated since midnight": "Generated since midnight",
      "Total Net Weight": "Total Net Weight",
      "Collected today": "Collected today",
      "Active Vehicles": "Active Vehicles",
      "Operating today": "Operating today",
      "Materials Tracked": "Materials Tracked",
      "Total categories": "Total categories",
      "Daily Collection Trend (7 Days)": "Daily Collection Trend (7 Days)",
      "Hourly Slip Generation (Today)": "Hourly Slip Generation (Today)",
      "Net Weight (KG)": "Net Weight (KG)",
      "Slips Generated": "Slips Generated",
      "Vehicle Types (Today)": "Vehicle Types (Today)",
      "Weight by Vehicle Type": "Weight by Vehicle Type",
      
      // Weighment
      "Weighment Entry": "Weighment Entry",
      "Vehicle": "Vehicle",
      "Select Vehicle": "Select Vehicle",
      "Material": "Material",
      "Select Material": "Select Material",
      "Source": "Source",
      "Select Source": "Select Source",
      "Destination": "Destination",
      "Select Destination": "Select Destination",
      "Remarks": "Remarks",
      "Optional remarks...": "Optional remarks...",
      "Live Weight Indicator": "Live Weight Indicator",
      "Vehicle Info": "Vehicle Info",
      "Number:": "Number:",
      "Driver:": "Driver:",
      "Weight Summary": "Weight Summary",
      "Gross:": "Gross:",
      "Tare:": "Tare:",
      "Net:": "Net:",
      "Generate Slip": "Generate Slip",
      "Print Last": "Print Last",
      "Reset Form": "Reset Form",
      "Conn": "Conn",
      "Read": "Read",
      "Stab": "Stab",
      "Disc": "Disc",
      
      // Reports
      "View and reprint historical weighment slips.": "View and reprint historical weighment slips.",
      "Search slips...": "Search slips...",
      "Export CSV": "Export CSV",
      "Date & Time": "Date & Time",
      "Slip No": "Slip No",
      "Operator": "Operator",
      "Gross Wt": "Gross Wt",
      "Tare Wt": "Tare Wt",
      "Net Wt": "Net Wt",
      "Actions": "Actions",
      "Print": "Print",
      "No weighment slips found. Generate a slip first.": "No weighment slips found. Generate a slip first.",
      "Showing": "Showing",
      "records": "records",
      "Previous": "Previous",
      "Next": "Next"
    }
  },
  hi: {
    translation: {
      "Dashboard": "डैशबोर्ड",
      "Weighment": "वजन प्रविष्टि",
      "Vehicles": "वाहन",
      "Materials": "सामग्री",
      "Sources": "स्रोत",
      "Destinations": "गंतव्य",
      "Slip History": "पर्ची इतिहास",
      "Users": "उपयोगकर्ता",
      "Settings": "सेटिंग्स",
      
      "NATURE GREEN": "नेचर ग्रीन",
      "Designed & Developed by": "द्वारा डिज़ाइन और विकसित",
      
      "Weighbridge Connected": "कांटा जुड़ा हुआ है",
      "Weighbridge Disconnected": "कांटा नहीं जुड़ा है",
      
      // Dashboard
      "Overview": "अवलोकन",
      "Live operational metrics and weighment statistics.": "लाइव परिचालन मेट्रिक्स और वजन के आंकड़े।",
      "Refresh": "रिफ्रेश",
      "Total Slips Today": "आज कुल पर्चियां",
      "Generated since midnight": "आधी रात से उत्पन्न",
      "Total Net Weight": "कुल शुद्ध वजन",
      "Collected today": "आज का संग्रह",
      "Active Vehicles": "सक्रिय वाहन",
      "Operating today": "आज कार्यरत",
      "Materials Tracked": "सामग्री श्रेणियां",
      "Total categories": "कुल श्रेणियां",
      "Daily Collection Trend (7 Days)": "दैनिक संग्रह प्रवृत्ति (7 दिन)",
      "Hourly Slip Generation (Today)": "प्रति घंटा पर्ची (आज)",
      "Net Weight (KG)": "शुद्ध वजन (किलो)",
      "Slips Generated": "पर्चियां उत्पन्न",
      "Vehicle Types (Today)": "वाहन के प्रकार (आज)",
      "Weight by Vehicle Type": "वाहन प्रकार के अनुसार वजन",
      
      // Weighment
      "Weighment Entry": "वजन प्रविष्टि",
      "Vehicle": "वाहन",
      "Select Vehicle": "वाहन चुनें",
      "Material": "सामग्री",
      "Select Material": "सामग्री चुनें",
      "Source": "स्रोत",
      "Select Source": "स्रोत चुनें",
      "Destination": "गंतव्य",
      "Select Destination": "गंतव्य चुनें",
      "Remarks": "टिप्पणियाँ",
      "Optional remarks...": "वैकल्पिक टिप्पणियाँ...",
      "Live Weight Indicator": "लाइव वजन सूचक",
      "Vehicle Info": "वाहन जानकारी",
      "Number:": "नंबर:",
      "Driver:": "ड्राइवर:",
      "Weight Summary": "वजन सारांश",
      "Gross:": "सकल:",
      "Tare:": "खाली:",
      "Net:": "शुद्ध:",
      "Generate Slip": "पर्ची उत्पन्न करें",
      "Print Last": "पिछली प्रिंट करें",
      "Reset Form": "फॉर्म रीसेट करें",
      "Conn": "जुड़ा",
      "Read": "पढ़ना",
      "Stab": "स्थिर",
      "Disc": "डिस्क",
      
      // Reports
      "View and reprint historical weighment slips.": "ऐतिहासिक वजन पर्चियां देखें और दोबारा प्रिंट करें।",
      "Search slips...": "पर्चियां खोजें...",
      "Export CSV": "CSV निर्यात करें",
      "Date & Time": "दिनांक और समय",
      "Slip No": "पर्ची नंबर",
      "Operator": "ऑपरेटर",
      "Gross Wt": "सकल वजन",
      "Tare Wt": "खाली वजन",
      "Net Wt": "शुद्ध वजन",
      "Actions": "क्रियाएँ",
      "Print": "प्रिंट",
      "No weighment slips found. Generate a slip first.": "कोई वजन पर्ची नहीं मिली। पहले पर्ची उत्पन्न करें।",
      "Showing": "दिखा रहे हैं",
      "records": "रिकॉर्ड",
      "Previous": "पिछला",
      "Next": "अगला"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
