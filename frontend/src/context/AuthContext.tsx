import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Language } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  login: (bhoomiId: string, pass: string) => Promise<void>;
  logout: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    system_title: "Land Record Management Information System",
    sub_title: "WebGIS Portal | BhoomiAI",
    tagline: "From Legacy Records to Trusted Digital Land Data.",
    overview: "Overview",
    map_view: "Map View",
    documents: "Documents",
    upload_record: "Upload Record",
    land_records: "Land Records",
    verification_queue: "Verification Queue",
    validation_issues: "Validation Issues",
    analytics: "Analytics",
    audit_trail: "Audit Trail",
    settings: "Settings",
    logout: "Logout",
    total_docs: "Total Documents",
    processed_docs: "Processed Documents",
    pending_verif: "Pending Verification",
    verified_records: "Verified Records",
    validation_errors: "Validation Errors",
    duplicate_records: "Duplicate Records",
    avg_ocr_conf: "Average OCR Confidence",
    locate_khasra: "Locate Khasra",
    map_layers: "Map Layers",
    draw_tools: "Draw Tools",
    measure: "Measure",
    search_by_address: "Search by Address",
    search: "Search",
    need_help: "Need Help?",
    help_desc: "Access comprehensive guides, tutorials, and API documentation to get the most out of your WebGIS portal.",
  },
  mr: {
    system_title: "जमीन अभिलेख व्यवस्थापन माहिती प्रणाली",
    sub_title: "वेबजीआयएस पोर्टल | भूमी-AI",
    tagline: "पारंपारिक नोंदींपासून ते विश्वसनीय डिजिटल भूमी डेटापर्यंत.",
    overview: "मुख्य फलक (Overview)",
    map_view: "नकाशा दृश्य (GIS Map)",
    documents: "दस्तऐवज (Documents)",
    upload_record: "भूमी अभिलेख अपलोड करा",
    land_records: "भूमी अभिलेख नोंदवही",
    verification_queue: "सत्यापन रांग (Verification Queue)",
    validation_issues: "वैधता त्रुटी (Validation Issues)",
    analytics: "विश्लेषण (Analytics)",
    audit_trail: "ऑडिट मागोवा (Audit Trail)",
    settings: "सेटिंद्ग्स (Settings)",
    logout: "लॉगआउट",
    total_docs: "एकूण दस्तऐवज",
    processed_docs: "प्रक्रिया केलेले दस्तऐवज",
    pending_verif: "प्रलंबित सत्यापन",
    verified_records: "सत्यापित नोंदी",
    validation_errors: "वैधता त्रुटी",
    duplicate_records: "दुप्पट/साम्य नोंदी",
    avg_ocr_conf: "सरासरी OCR अचूकता",
    locate_khasra: "खसरा / सर्वे शोधा",
    map_layers: "नकाशा स्तर (Layers)",
    draw_tools: "आलेखन साधने",
    measure: "मोजमाप",
    search_by_address: "पत्याद्वारे शोधा",
    search: "शोधा",
    need_help: "मदत हवी आहे?",
    help_desc: "वेबजीआयएस पोर्टलचा पूर्ण वापर करण्यासाठी सर्वसमावेशक मार्गदर्शक, ट्यूटोरिअल्स आणि API दस्तऐवजीकरण पहा.",
  },
  hi: {
    system_title: "भूमि अभिलेख प्रबंधन सूचना प्रणाली",
    sub_title: "वेबजीआईएस पोर्टल | भूमि-AI",
    tagline: "पारंपरिक अभिलेखों से विश्वसनीय डिजिटल भूमि डेटा तक।",
    overview: "अवलोकन (Overview)",
    map_view: "मानचित्र दृश्य (GIS Map)",
    documents: "दस्तावेज़ (Documents)",
    upload_record: "भूमि अभिलेख अपलोड करें",
    land_records: "भूमि अभिलेख",
    verification_queue: "सत्यापन कतार (Verification Queue)",
    validation_issues: "वैधता मुद्दे (Validation Issues)",
    analytics: "विश्लेषण (Analytics)",
    audit_trail: "ऑडिट ट्रेल (Audit Trail)",
    settings: "सेटिंग्स",
    logout: "लॉगआउट",
    total_docs: "कुल दस्तावेज",
    processed_docs: "संसाधित दस्तावेज",
    pending_verif: "लंबित सत्यापन",
    verified_records: "सत्यापित रिकॉर्ड",
    validation_errors: "वैधता त्रुटियां",
    duplicate_records: "डुपिलकेट रिकॉर्ड",
    avg_ocr_conf: "औसत OCR सटीकता",
    locate_khasra: "खसरा / सर्वे खोजें",
    map_layers: "मानचित्र परतें",
    draw_tools: "ड्रॉ टूल्स",
    measure: "मापन",
    search_by_address: "पते द्वारा खोजें",
    search: "खोजें",
    need_help: "सहायता चाहिए?",
    help_desc: "वेबजीआईएस पोर्टल का अधिकतम लाभ उठाने के लिए विस्तृत गाइड, ट्यूटोरियल और एपीआई दस्तावेज देखें।",
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bhoomiai_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [language, setLanguage] = useState<Language>('en');

  const login = async (bhoomiId: string, pass: string) => {
    try {
      const res = await api.login(bhoomiId, pass);
      setUser(res.user);
      localStorage.setItem('bhoomiai_user', JSON.stringify(res.user));
      if (res.access_token) {
        localStorage.setItem('bhoomiai_token', res.access_token);
      }
    } catch {
      // Fallback demo user
      const normalizedBhoomiId = bhoomiId.toUpperCase();
      const isDemoAdmin = normalizedBhoomiId === 'BHOOMI-ADMIN-0001' && pass === 'admin123';
      const isDemoOfficer = normalizedBhoomiId === 'BHOOMI-OFFICER-0002' && pass === 'officer123';
      if (!isDemoAdmin && !isDemoOfficer) {
        throw new Error('Invalid Bhoomi ID, password, or account approval status.');
      }
      const demoUser: User = {
        id: 'demo-user-id',
        bhoomi_id: bhoomiId,
        email: isDemoAdmin ? 'admin@bhoomiai.demo' : 'officer@bhoomiai.demo',
        name: isDemoAdmin ? 'SYSTEM ADMINISTRATOR' : 'REVENUE OFFICER PATIL',
        role: isDemoAdmin ? 'ADMIN' : 'OFFICER',
        account_status: 'ACTIVE',
      };
      setUser(demoUser);
      localStorage.setItem('bhoomiai_user', JSON.stringify(demoUser));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bhoomiai_user');
    localStorage.removeItem('bhoomiai_token');
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <AuthContext.Provider value={{ user, language, setLanguage, login, logout, t }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
