import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  BadgeCheck,
  Building2,
  BriefcaseBusiness,
  Hash,
  KeyRound,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';

type AuthMode = 'login' | 'create';
type OtpStatus = 'idle' | 'sent' | 'verified';

interface OfficialAccountForm {
  designation: string;
  fullName: string;
  department: string;
  employeeId: string;
  jurisdiction: string;
  role: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

const emptyOfficialForm: OfficialAccountForm = {
  designation: '',
  fullName: '',
  department: '',
  employeeId: '',
  jurisdiction: '',
  role: 'Revenue Officer',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
};

const demoBhoomiIds = {
  admin: 'BHOOMI-ADMIN-0001',
  officer: 'BHOOMI-OFFICER-0002',
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const FieldIcon: React.FC<{ icon: React.ElementType }> = ({ icon: Icon }) => (
  <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
);

const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  icon: React.ElementType;
  required?: boolean;
}> = ({ label, value, onChange, placeholder, type = 'text', icon, required = true }) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-slate-700">{label}</label>
    <div className="relative">
      <FieldIcon icon={icon} />
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
      />
    </div>
  </div>
);

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [bhoomiLoginId, setBhoomiLoginId] = useState(demoBhoomiIds.admin);
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [officialForm, setOfficialForm] = useState<OfficialAccountForm>(emptyOfficialForm);
  const [otpStatus, setOtpStatus] = useState<OtpStatus>('idle');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [bhoomiId, setBhoomiId] = useState('');
  const [createError, setCreateError] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const updateOfficialForm = (key: keyof OfficialAccountForm, value: string) => {
    setOfficialForm((current) => ({ ...current, [key]: value }));
    setCreateError('');
    setCreateMessage('');
    if (key === 'email' || key === 'mobile') {
      setOtpStatus('idle');
      setGeneratedOtp('');
      setEnteredOtp('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCreateError('');
    try {
      await login(bhoomiLoginId, password);
      navigate('/dashboard');
    } catch (error: any) {
      setCreateError(error?.response?.data?.detail || error?.message || 'Login failed. Check Bhoomi ID, password, and approval status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoBhoomiId: string, demoPassword: string) => {
    setBhoomiLoginId(demoBhoomiId);
    setPassword(demoPassword);
    setLoading(true);
    await login(demoBhoomiId, demoPassword);
    setLoading(false);
    navigate('/dashboard');
  };

  const getApiError = (error: any, fallback: string) => error?.response?.data?.detail || fallback;

  const handleSendOtp = async () => {
    if (!officialForm.email || !officialForm.mobile) {
      setCreateError('Enter official email and mobile number before requesting OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendRegistrationOtp(officialForm.email, officialForm.mobile);
      const otp = res.demo_otp || generateOtp();
      setGeneratedOtp(otp);
      setEnteredOtp(otp);
      setOtpStatus('sent');
      setCreateMessage(`OTP sent. It expires in ${res.expires_in_minutes} minutes.`);
      setCreateError('');
    } catch (error: any) {
      setCreateError(getApiError(error, 'Could not send OTP. Please check backend connection.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await api.verifyRegistrationOtp(officialForm.email, officialForm.mobile, enteredOtp);
      setOtpStatus('verified');
      setCreateMessage('OTP verified successfully.');
      setCreateError('');
    } catch (error: any) {
      setCreateError(getApiError(error, 'OTP does not match. Please check the code sent to email/mobile.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (officialForm.password !== officialForm.confirmPassword) {
      setCreateError('Password and confirm password must match.');
      return;
    }
    if (otpStatus !== 'verified') {
      setCreateError('Verify the OTP sent to the official email/mobile before creating the account.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.createOfficialAccount({
        designation: officialForm.designation,
        full_name: officialForm.fullName,
        department: officialForm.department,
        employee_id: officialForm.employeeId,
        jurisdiction: officialForm.jurisdiction,
        requested_role: officialForm.role,
        email: officialForm.email,
        mobile_no: officialForm.mobile,
        password: officialForm.password,
        otp_code: enteredOtp,
      });
      setBhoomiId(res.bhoomi_id);
      setCreateMessage(res.message);
      setCreateError('');
    } catch (error: any) {
      setCreateError(getApiError(error, 'Could not create account request. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleUseCreatedAccount = () => {
    setBhoomiLoginId(bhoomiId);
    setPassword(officialForm.password);
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className={`w-full ${mode === 'create' ? 'max-w-4xl' : 'max-w-md'} bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-100 p-8 space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300`}>
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-700/20 ring-4 ring-emerald-100">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Bhoomi<span className="text-emerald-700">AI</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Intelligent Land Record Digitization & Validation
          </p>
        </div>

        {mode === 'login' ? (
          <>
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <TextInput
                label="Bhoomi ID"
                value={bhoomiLoginId}
                onChange={setBhoomiLoginId}
                placeholder="BHOOMI-ADMIN-0001"
                icon={BadgeCheck}
              />

              <TextInput
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Password"
                icon={Lock}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 group"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {createError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-medium px-1">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className="text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                >
                  Create account
                </button>
                <a href="#" className="text-slate-500 hover:text-slate-700 hover:underline transition-colors">Forgot password?</a>
              </div>
            </form>

            {/* Quick Demo Accounts */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Quick Demo Accounts</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDemoLogin(demoBhoomiIds.admin, 'admin123')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Admin Login</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{demoBhoomiIds.admin}</p>
                </button>

                <button
                  onClick={() => handleDemoLogin(demoBhoomiIds.officer, 'officer123')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-sky-900">Officer Login</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{demoBhoomiIds.officer}</p>
                </button>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-center text-[11px] font-medium text-slate-400">
              "From Legacy Records to Trusted Digital Land Data."
            </p>
          </>
        ) : (
          <form onSubmit={handleCreateAccount} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100">
                Official account creation
              </span>
            </div>

            {bhoomiId ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-3">
                <BadgeCheck className="w-10 h-10 text-emerald-700 mx-auto" />
                <div>
                  <h2 className="text-lg font-black text-slate-900">Account Request Created</h2>
                  <p className="text-sm text-slate-600">This Bhoomi ID is ready for admin approval before sign in.</p>
                </div>
                <div className="rounded-xl bg-white border border-emerald-200 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Bhoomi ID</p>
                  <p className="text-xl font-black text-emerald-800">{bhoomiId}</p>
                </div>
                <button
                  type="button"
                  onClick={handleUseCreatedAccount}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Prefill Sign In
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextInput
                    label="Designation"
                    value={officialForm.designation}
                    onChange={(value) => updateOfficialForm('designation', value)}
                    placeholder="Talathi / Revenue Officer"
                    icon={BriefcaseBusiness}
                  />
                  <TextInput
                    label="Full Name"
                    value={officialForm.fullName}
                    onChange={(value) => updateOfficialForm('fullName', value)}
                    placeholder="Official full name"
                    icon={UserRound}
                  />
                  <TextInput
                    label="Department"
                    value={officialForm.department}
                    onChange={(value) => updateOfficialForm('department', value)}
                    placeholder="Land Records Department"
                    icon={Building2}
                  />
                  <TextInput
                    label="Employee / Officer ID"
                    value={officialForm.employeeId}
                    onChange={(value) => updateOfficialForm('employeeId', value)}
                    placeholder="Government employee ID"
                    icon={Hash}
                  />
                  <TextInput
                    label="Jurisdiction / District"
                    value={officialForm.jurisdiction}
                    onChange={(value) => updateOfficialForm('jurisdiction', value)}
                    placeholder="Pune / Vaijapur / Indore"
                    icon={MapPin}
                  />

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Requested Access Role</label>
                    <div className="relative">
                      <FieldIcon icon={BadgeCheck} />
                      <select
                        required
                        value={officialForm.role}
                        onChange={(e) => updateOfficialForm('role', e.target.value)}
                        className="w-full appearance-none pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      >
                        <option>Revenue Officer</option>
                        <option>Verification Supervisor</option>
                        <option>District Administrator</option>
                        <option>GIS Analyst</option>
                        <option>Data Entry Operator</option>
                      </select>
                    </div>
                  </div>

                  <TextInput
                    label="Official Email"
                    type="email"
                    value={officialForm.email}
                    onChange={(value) => updateOfficialForm('email', value)}
                    placeholder="name@department.gov.in"
                    icon={Mail}
                  />
                  <TextInput
                    label="Mobile Number"
                    type="tel"
                    value={officialForm.mobile}
                    onChange={(value) => updateOfficialForm('mobile', value)}
                    placeholder="+91 98765 43210"
                    icon={Phone}
                  />
                  <TextInput
                    label="Create Password"
                    type="password"
                    value={officialForm.password}
                    onChange={(value) => updateOfficialForm('password', value)}
                    placeholder="Create password"
                    icon={KeyRound}
                  />
                  <TextInput
                    label="Confirm Password"
                    type="password"
                    value={officialForm.confirmPassword}
                    onChange={(value) => updateOfficialForm('confirmPassword', value)}
                    placeholder="Confirm password"
                    icon={Lock}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4 self-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Verification</p>
                    <h2 className="text-lg font-black text-slate-900">Email / Mobile OTP</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Verify the official email or mobile number before Bhoomi ID generation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP to Email / Mobile'}
                  </button>

                  {otpStatus !== 'idle' && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                        Demo OTP: {generatedOtp}
                      </div>
                      <TextInput
                        label="Enter OTP"
                        value={enteredOtp}
                        onChange={setEnteredOtp}
                        placeholder="6-digit OTP"
                        icon={Shield}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold ${
                          otpStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {otpStatus === 'verified' ? 'OTP Verified' : loading ? 'Verifying OTP...' : 'Verify OTP'}
                      </button>
                    </div>
                  )}

                  <div className="space-y-2 text-xs text-slate-500">
                    <p className="font-bold text-slate-700">Included checks</p>
                    <p>Official designation, department, employee ID, jurisdiction, access role, email, mobile, and password.</p>
                  </div>
                </div>
              </div>
            )}

            {createError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {createError}
              </div>
            )}

            {createMessage && !createError && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {createMessage}
              </div>
            )}

            {!bhoomiId && (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Official Account...' : 'Create Official Account & Generate Bhoomi ID'}
                <BadgeCheck className="w-4 h-4" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
