import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { errorMessage } from '../../../api/axios'
import {
  compactErrors,
  hasErrors,
  isBlank,
  mobileError,
  optionalEmailError,
  optionalMobileError,
  requiredSelect,
  requiredText,
  type FieldErrors,
} from '../../../lib/formValidation'
import { endpoints } from '../../../api/endpoints'
import { useAreas, useSimpleMaster, useReferrers } from '../../masters/api'
import { useCheckDuplicates, useRegisterPatient, useUploadPatientPhoto } from '../api'
import { PatientPhotoCapture } from '../components/PatientPhotoCapture'
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPES,
  GENDER_LABELS,
  GENDERS,
  IDENTIFIER_TYPE_LABELS,
  IDENTIFIER_TYPES,
  type ContactType,
  type DuplicateCandidate,
  type Gender,
  type IdentifierType,
  type SavePatientContact,
  type SavePatientIdentifier,
  type SavePatientInsurancePolicy,
} from '../types'
import { DuplicateWarningModal } from '../components/DuplicateWarningModal'
import {
  Check,
  User,
  ArrowLeft,
  ArrowRight,
  Save,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react'

const steps = [
  { id: 1, title: 'Demographics', sub: 'Name, age, gender' },
  { id: 2, title: 'Contact & Address', sub: 'Phone, city, kin' },
  { id: 3, title: 'Guardian & IDs', sub: 'ID, Guardian, Payer' },
  { id: 4, title: 'Review & Confirm', sub: 'Verify & print' },
] as const

interface FormState {
  salutationId: string
  firstName: string
  middleName: string
  lastName: string
  gender: Gender
  dobKnown: boolean
  dateOfBirth: string
  estimatedAge: string
  bloodGroup: string
  maritalStatusId: string
  languageId: string
  patientCaseTypeId: string
  patientHcTagId: string
  speciallyAbledCategoryId: string
  isVip: boolean
  smsOptIn: boolean
  occupation: string
  monthlyIncome: string
  motherName: string
  nationalId: string
  mobile: string
  alternateMobile: string
  whatsAppNumber: string
  email: string
  address: string
  permanentAddress: string
  isPermanentSameAsPresent: boolean
  countryId: string
  nationalityId: string
  stateId: string
  cityId: string
  areaId: string
  pincode: string
  patientCategoryId: string
  referrerId: string
  insuranceRequired: boolean
  remarks: string
  contacts: SavePatientContact[]
  identifiers: SavePatientIdentifier[]
  insurancePolicies: SavePatientInsurancePolicy[]
}

const emptyForm: FormState = {
  salutationId: '',
  firstName: '',
  middleName: '',
  lastName: '',
  gender: GENDERS.Male,
  dobKnown: true,
  dateOfBirth: '',
  estimatedAge: '',
  bloodGroup: '',
  maritalStatusId: '',
  languageId: '',
  patientCaseTypeId: '',
  patientHcTagId: '',
  speciallyAbledCategoryId: '',
  isVip: false,
  smsOptIn: true,
  occupation: '',
  monthlyIncome: '',
  motherName: '',
  nationalId: '',
  mobile: '',
  alternateMobile: '',
  whatsAppNumber: '',
  email: '',
  address: '',
  permanentAddress: '',
  isPermanentSameAsPresent: true,
  countryId: '',
  nationalityId: '',
  stateId: '',
  cityId: '',
  areaId: '',
  pincode: '',
  patientCategoryId: '',
  referrerId: '',
  insuranceRequired: false,
  remarks: '',
  contacts: [],
  identifiers: [],
  insurancePolicies: [],
}

const emptyContact: SavePatientContact = {
  contactType: CONTACT_TYPES.Guardian,
  name: '',
  relationship: '',
  phone: '',
  email: '',
  address: '',
  isPrimary: false,
}

const emptyInsurancePolicy: SavePatientInsurancePolicy = {
  insuranceCompanyId: 0,
  policyNumber: '',
  policyValidFrom: null,
  policyValidTo: null,
  isPrimary: false,
}

function calcAge(dobStr: string): number | null {
  if (!dobStr) return null
  const d = new Date(dobStr)
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a >= 0 && a <= 130 ? a : null
}

export function PatientRegistrationWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null)
  const [toastMsg, setToastMsg] = useState<{ title: string; sub?: string } | null>(null)

  const showToast = (title: string, sub?: string) => {
    setToastMsg({ title, sub })
    setTimeout(() => setToastMsg(null), 3500)
  }

  const { data: categories = [] } = useSimpleMaster('patientcategories', endpoints.masters.patientCategories)
  const { data: referrersResult } = useReferrers({ page: 1, pageSize: 100 })
  const { data: salutations = [] } = useSimpleMaster('salutations', endpoints.masters.salutations)
  const { data: maritalStatuses = [] } = useSimpleMaster('marital-statuses', endpoints.masters.maritalStatuses)
  const { data: languages = [] } = useSimpleMaster('languages', endpoints.masters.languages)
  const { data: patientCaseTypes = [] } = useSimpleMaster('patient-case-types', endpoints.masters.patientCaseTypes)
  const { data: patientHcTags = [] } = useSimpleMaster('patient-hc-tags', endpoints.masters.patientHcTags)
  const { data: speciallyAbledCategories = [] } = useSimpleMaster(
    'specially-abled-categories',
    endpoints.masters.speciallyAbledCategories,
  )
  const { data: countries = [] } = useSimpleMaster('nationalities', endpoints.masters.nationalities)
  const { data: states = [] } = useSimpleMaster('states', endpoints.masters.states)
  const { data: cities = [] } = useSimpleMaster('cities', endpoints.masters.cities)
  const { data: areas = [] } = useAreas(form.cityId ? Number(form.cityId) : undefined)
  const { data: identityDocumentTypes = [] } = useSimpleMaster(
    'identity-document-types',
    endpoints.masters.identityDocumentTypes,
  )
  const { data: insuranceCompanies = [] } = useSimpleMaster('insurance-companies', endpoints.masters.insuranceCompanies)

  const checkDuplicates = useCheckDuplicates()
  const register = useRegisterPatient()
  const uploadPhoto = useUploadPatientPhoto()

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const validateStep = (target: number): FieldErrors => {
    if (target === 0) {
      return compactErrors({
        firstName: requiredText(form.firstName, 'First name'),
        lastName: requiredText(form.lastName, 'Last name'),
        dateOfBirth: form.dobKnown ? requiredText(form.dateOfBirth, 'Date of birth') : undefined,
        estimatedAge: form.dobKnown ? undefined : requiredText(form.estimatedAge, 'Estimated age'),
      })
    }
    if (target === 1) {
      return compactErrors({
        mobile: mobileError(form.mobile),
        alternateMobile: optionalMobileError(form.alternateMobile),
        whatsAppNumber: optionalMobileError(form.whatsAppNumber),
        email: optionalEmailError(form.email),
      })
    }
    if (target === 2) {
      const errors: FieldErrors = {}
      form.contacts.forEach((contact, index) => {
        const name = requiredText(contact.name, 'Name')
        if (name) errors[`contact-${index}-name`] = name
        const phone = optionalMobileError(contact.phone)
        if (phone) errors[`contact-${index}-phone`] = phone
      })
      form.identifiers.forEach((identifier, index) => {
        if (isBlank(identifier.value) && identifier.identityDocumentTypeId === null) return
        const value = requiredText(identifier.value, 'ID number')
        if (value) errors[`identifier-${index}-value`] = value
        if (identifier.type === IDENTIFIER_TYPES.Other && !identifier.identityDocumentTypeId) {
          errors[`identifier-${index}-type`] = 'Select a document type.'
        }
      })
      if (form.insuranceRequired) {
        if (form.insurancePolicies.length === 0) {
          errors.insurancePolicies = 'Add at least one policy, or uncheck Insurance required.'
        }
        form.insurancePolicies.forEach((policy, index) => {
          const insurer = requiredSelect(policy.insuranceCompanyId, 'Insurer / TPA')
          if (insurer) errors[`policy-${index}-insurer`] = insurer
          const number = requiredText(policy.policyNumber, 'Policy number')
          if (number) errors[`policy-${index}-number`] = number
        })
      }
      return errors
    }
    return {}
  }

  const goNext = () => {
    const errors = validateStep(step)
    setFieldErrors(errors)
    if (hasErrors(errors)) {
      setError('Please check the highlighted required fields below.')
      return
    }
    setError(null)
    setStep((s) => Math.min(s + 1, steps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setError(null)
    setFieldErrors({})
    setStep((s) => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const buildPayload = () => ({
    salutationId: form.salutationId ? Number(form.salutationId) : null,
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim() || null,
    lastName: form.lastName.trim(),
    gender: form.gender,
    dateOfBirth: form.dobKnown && form.dateOfBirth ? form.dateOfBirth : null,
    estimatedAge: !form.dobKnown && form.estimatedAge ? Number(form.estimatedAge) : null,
    bloodGroup: form.bloodGroup || null,
    maritalStatusId: form.maritalStatusId ? Number(form.maritalStatusId) : null,
    mobile: form.mobile.trim(),
    alternateMobile: form.alternateMobile || null,
    whatsAppNumber: form.whatsAppNumber || null,
    email: form.email || null,
    address: form.address || null,
    permanentAddress: form.isPermanentSameAsPresent ? null : form.permanentAddress || null,
    isPermanentSameAsPresent: form.isPermanentSameAsPresent,
    stateId: form.stateId ? Number(form.stateId) : null,
    cityId: form.cityId ? Number(form.cityId) : null,
    areaId: form.areaId ? Number(form.areaId) : null,
    pincode: form.pincode || null,
    countryId: form.countryId ? Number(form.countryId) : null,
    nationalityId: form.nationalityId ? Number(form.nationalityId) : null,
    occupation: form.occupation || null,
    monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : null,
    languageId: form.languageId ? Number(form.languageId) : null,
    motherName: form.motherName || null,
    nationalId: form.nationalId || null,
    patientCaseTypeId: form.patientCaseTypeId ? Number(form.patientCaseTypeId) : null,
    patientHcTagId: form.patientHcTagId ? Number(form.patientHcTagId) : null,
    speciallyAbledCategoryId: form.speciallyAbledCategoryId ? Number(form.speciallyAbledCategoryId) : null,
    isVip: form.isVip,
    smsOptIn: form.smsOptIn,
    insuranceRequired: form.insuranceRequired,
    remarks: form.remarks || null,
    patientCategoryId: form.patientCategoryId ? Number(form.patientCategoryId) : null,
    referrerId: form.referrerId ? Number(form.referrerId) : null,
    contacts: form.contacts,
    identifiers: form.identifiers.filter((i) => i.value.trim().length > 0),
    insurancePolicies: form.insuranceRequired
      ? form.insurancePolicies.filter((p) => p.insuranceCompanyId > 0 && p.policyNumber.trim().length > 0)
      : [],
  })

  const submitRegistration = async (confirmDuplicate = false) => {
    setError(null)
    try {
      const result = await register.mutateAsync({ ...buildPayload(), confirmDuplicate })
      if (photoFile) {
        await uploadPhoto.mutateAsync({ patientId: result.id, file: photoFile }).catch(() => {})
      }
      showToast('Registration complete', `UHID PRV-2026-${result.id} created successfully.`)
      navigate(`/patients/${result.id}`, { state: { justRegistered: true } })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const checkAndRegister = async () => {
    setError(null)
    for (const target of [0, 1, 2]) {
      const errors = validateStep(target)
      if (hasErrors(errors)) {
        setFieldErrors(errors)
        setStep(target)
        setError('Please complete the required fields.')
        return
      }
    }
    setFieldErrors({})
    try {
      const candidates = await checkDuplicates.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dobKnown && form.dateOfBirth ? form.dateOfBirth : null,
        mobile: form.mobile.trim() || null,
        excludePatientId: null,
      })
      if (candidates.length > 0) {
        setDuplicates(candidates)
      } else {
        await submitRegistration()
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const addContact = () => set('contacts', [...form.contacts, { ...emptyContact }])
  const updateContact = (index: number, patch: Partial<SavePatientContact>) =>
    set('contacts', form.contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  const removeContact = (index: number) => set('contacts', form.contacts.filter((_, i) => i !== index))

  const addIdentifier = () =>
    set('identifiers', [...form.identifiers, { type: IDENTIFIER_TYPES.Aadhaar, identityDocumentTypeId: null, value: '' }])
  const updateIdentifier = (index: number, patch: Partial<SavePatientIdentifier>) =>
    set('identifiers', form.identifiers.map((idf, i) => (i === index ? { ...idf, ...patch } : idf)))
  const removeIdentifier = (index: number) => set('identifiers', form.identifiers.filter((_, i) => i !== index))

  const addInsurancePolicy = () => set('insurancePolicies', [...form.insurancePolicies, { ...emptyInsurancePolicy }])
  const updateInsurancePolicy = (index: number, patch: Partial<SavePatientInsurancePolicy>) =>
    set('insurancePolicies', form.insurancePolicies.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  const removeInsurancePolicy = (index: number) =>
    set('insurancePolicies', form.insurancePolicies.filter((_, i) => i !== index))

  // Live preview helpers
  const salutationLabel = salutations.find((s) => String(s.id) === form.salutationId)?.name ?? ''
  const fullName = [salutationLabel, form.firstName.trim(), form.middleName.trim(), form.lastName.trim()]
    .filter(Boolean)
    .join(' ') || '— —'
  const initials = ([form.firstName[0], form.lastName[0]].filter(Boolean).join('') || '••').toUpperCase()
  const ageDisplay = form.dobKnown
    ? form.dateOfBirth
      ? `${calcAge(form.dateOfBirth) ?? '—'} yrs`
      : 'Age —'
    : form.estimatedAge
    ? `${form.estimatedAge} yrs (est.)`
    : 'Age —'
  const selectedCaseType = patientCaseTypes.find((c) => String(c.id) === form.patientCaseTypeId)?.name ?? 'General'
  const selectedTag = patientHcTags.find((t) => String(t.id) === form.patientHcTagId)?.name ?? 'New'
  const selectedLanguage = languages.find((l) => String(l.id) === form.languageId)?.name ?? '—'

  // Completeness score
  const { score, checks } = useMemo(() => {
    let s = 12
    const c = {
      name: !!(form.firstName.trim() && form.lastName.trim()),
      age: !!(form.dobKnown ? form.dateOfBirth : form.estimatedAge),
      blood: !!form.bloodGroup,
      contact: !!form.mobile.trim(),
    }
    if (c.name) s += 28
    if (c.age) s += 26
    if (c.blood) s += 16
    if (form.smsOptIn) s += 6
    if (step >= 1) s = Math.max(s, 72)
    if (step >= 2) s = Math.max(s, 88)
    if (step >= 3) s = Math.min(98, s + 6)
    return { score: Math.min(98, s), checks: c }
  }, [form.firstName, form.lastName, form.dobKnown, form.dateOfBirth, form.estimatedAge, form.bloodGroup, form.mobile, form.smsOptIn, step])

  const calculatedDobAge = form.dobKnown ? calcAge(form.dateOfBirth) : null

  return (
    <div className="mx-auto max-w-[1360px] pb-12">
      <style>{`
        .heroAnimated::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 3px;
          background: linear-gradient(90deg, #c66328, #c66328, #c6a15b, #c66328);
          background-size: 200% 100%;
          animation: slide 8s linear infinite;
        }
        @keyframes slide {
          to { background-position: 200% 0; }
        }
        .goldText {
          background: linear-gradient(90deg, #9a7a2e, #d8b96a);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>

      {/* Tabs navigation row */}
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-[11px] border border-[#e5e9f2] bg-white px-3 py-1.5 text-xs font-bold text-[#9e4f20] shadow-sm dark:border-white/10 dark:bg-[#1f1f1f] dark:text-[#e0a989]">
          <i className="flex size-5 items-center justify-center rounded-[7px] bg-[#f9ede1] text-[10px] not-italic text-[#c66328] dark:bg-[#2e1d12] dark:text-[#e0a989]">◈</i>
          OP Registration
        </span>
        <span className="text-xs text-[#8a94ad]">Front Office / OP / New</span>
        <Link
          to="/"
          className="ml-auto inline-flex items-center gap-1.5 rounded-[11px] border border-[#e5e9f2] bg-white px-3 py-1.5 text-xs font-semibold text-[#42506b] shadow-sm hover:border-[#dcc7a8] hover:text-[#191919] dark:border-white/10 dark:bg-white/5 dark:text-[#c2cdf3] transition-all"
        >
          ◈ Dashboard
        </Link>
      </div>

      {/* Hero Header & Stepper */}
      <section className="heroAnimated relative mb-4.5 overflow-hidden rounded-[20px] border border-[#e5e9f2] bg-gradient-to-b from-white to-[#fdf8f2] shadow-sm dark:border-white/8 dark:bg-gradient-to-b dark:from-[#191919] dark:to-[#141414]">
        <div className="flex flex-wrap items-start gap-4 p-5 sm:p-6 pb-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#191919] dark:text-white">
              New Patient <span className="goldText">Registration</span>
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#67748e] dark:text-[#a09a90]">
              <span className="rounded-full bg-gradient-to-r from-[#c66328] to-[#d07f4e] px-2.5 py-0.5 text-[10.5px] font-extrabold text-white">
                STEP {step + 1} OF 4
              </span>
              <span>{steps[step].title} — {steps[step].sub}</span>
            </p>
          </div>

          <div className="ml-auto flex flex-wrap gap-2.5">
            <div className="min-w-[120px] rounded-[14px] border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 dark:border-white/8 dark:bg-[#1f1f1f]">
              <small className="block text-[10px] font-extrabold tracking-wider text-[#8a94ad] uppercase">TODAY'S OP</small>
              <b className="font-display text-base text-[#191919] dark:text-white">248</b>
              <em className="block text-[11px] text-[#67748e] not-italic dark:text-[#a09a90]">+18 vs yesterday</em>
            </div>
            <div className="min-w-[120px] rounded-[14px] border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 dark:border-white/8 dark:bg-[#1f1f1f]">
              <small className="block text-[10px] font-extrabold tracking-wider text-[#8a94ad] uppercase">AVG WAIT</small>
              <b className="font-display text-base text-[#191919] dark:text-white">11 min</b>
              <em className="block text-[11px] text-[#67748e] not-italic dark:text-[#a09a90]">token system live</em>
            </div>
            <div className="min-w-[120px] rounded-[14px] border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 dark:border-white/8 dark:bg-[#1f1f1f]">
              <small className="block text-[10px] font-extrabold tracking-wider text-[#8a94ad] uppercase">QUEUE STATUS</small>
              <b className="font-display text-base text-[#9e4f20] dark:text-[#e0a989]">● Flowing</b>
              <em className="block text-[11px] text-[#67748e] not-italic dark:text-[#a09a90]">4 counters open</em>
            </div>
          </div>
        </div>

        {/* 4-Step Interactive Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 sm:px-6 pb-2">
          {steps.map((st, i) => {
            const isCurrent = i === step
            const isDone = i < step
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStep(i)}
                className={`relative flex items-center gap-2.5 overflow-hidden rounded-[14px] border p-2.5 text-left transition-all ${
                  isCurrent
                    ? 'border-[#9e4f20] bg-gradient-to-b from-[#c66328] to-[#9e4f20] text-white shadow-md'
                    : isDone
                    ? 'border-[#eed0be] bg-[#fdf8f2] text-[#191919] dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white'
                    : 'border-[#e5e9f2] bg-[#fdf8f2] text-[#67748e] hover:border-[#dcc7a8] dark:border-white/8 dark:bg-[#1a1a1a] dark:text-[#a09a90]'
                }`}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-[9px] text-xs font-extrabold ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : isDone
                      ? 'bg-[#f8ece5] text-[#9e4f20] dark:bg-[#2e1d12] dark:text-[#e0a989]'
                      : 'bg-[#f0eae2] text-[#67748e] dark:bg-[#2a2a2a] dark:text-[#a09a90]'
                  }`}
                >
                  {isDone ? <Check className="size-3.5 stroke-[3]" /> : `0${st.id}`}
                </div>
                <div className="min-w-0 flex-1">
                  <b className={`block text-xs font-bold leading-tight ${isCurrent ? 'text-white' : 'text-inherit'}`}>
                    {st.title}
                  </b>
                  <small className={`block text-[10.5px] truncate ${isCurrent ? 'text-[#f5ede0]' : 'text-[#67748e] dark:text-[#a09a90]'}`}>
                    {st.sub}
                  </small>
                </div>
                {isCurrent && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-[#ffe9b8] to-transparent" />
                )}
              </button>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="px-5 sm:px-6 pt-2 pb-4">
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#67748e] dark:text-[#a09a90]">
            <span>Step {step + 1} of 4 • {steps[step].title}</span>
            <span>{((step + 1) / 4) * 100}% complete</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-[#f0eae2] dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c66328] via-[#d07f4e] to-[#c6a15b] shadow-[0_0_12px_rgba(198,99,40,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      </section>

      {/* Main 2-column layout (Form + Preview Rail) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4.5 items-start">
        {/* FORM CONTAINER CARD */}
        <section className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#191919]">
          {/* Form Header */}
          <div className="flex items-center gap-3 border-b border-[#eef1f7] bg-gradient-to-b from-[#fdf8f2] to-white px-5 py-4 dark:border-white/8 dark:from-[#17203c] dark:to-[#141b31]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-[#e5e9f2] bg-gradient-to-br from-[#e9edff] to-[#d9f9f1] text-[#c66328] shadow-sm dark:border-white/10 dark:from-[#1f2b52] dark:to-[#241912]">
              <User className="size-4.5" />
            </div>
            <div className="min-w-0">
              <b className="block text-sm font-bold text-[#191919] dark:text-white">
                {step === 0 && 'Patient Demographics'}
                {step === 1 && 'Contact & Address'}
                {step === 2 && 'Guardian, IDs & Insurance'}
                {step === 3 && 'Review & Confirm'}
              </b>
              <small className="block text-xs text-[#67748e] dark:text-[#a09a90]">
                {step === 0 && 'Fields marked * are required for UHID generation'}
                {step === 1 && 'Mobile is used for token SMS & electronic reports'}
                {step === 2 && 'Government IDs, emergency attenders & insurance policies'}
                {step === 3 && 'Verify summary, capture photo & print OP ticket'}
              </small>
            </div>
            <div className="ml-auto text-right">
              <small className="block text-[9.5px] font-extrabold tracking-wider text-[#8a94ad] uppercase">AUTO UHID</small>
              <b className="font-display text-sm font-bold text-[#191919] dark:text-white">PRV-2026-08417</b>
              <em className="inline-block rounded-full border border-[#eed0be] bg-[#f8ece5] px-2 py-0.5 text-[10px] font-extrabold text-[#0a7a68] not-italic dark:border-[#9e4f20]/40 dark:bg-[#2e1d12] dark:text-[#c6a15b] ml-1.5">
                ● New
              </em>
            </div>
          </div>

          {error && (
            <div className="m-5 mb-0 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Content Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* STEP 0: Demographics */}
            {step === 0 && (
              <div className="space-y-4">
                {/* Salutation + Names */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      SALUTATION
                    </label>
                    <select
                      value={form.salutationId}
                      onChange={(e) => set('salutationId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— Select —</option>
                      {salutations.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      FIRST NAME <span className="text-[#ff5470]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aarav"
                      value={form.firstName}
                      onChange={(e) => set('firstName', e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:text-white ${
                        fieldErrors.firstName
                          ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/20'
                          : 'border-[#e5e9f2] bg-[#fdf8f2] focus:border-[#c66328] dark:border-white/10 dark:bg-[#1a1a1a]'
                      }`}
                    />
                    {fieldErrors.firstName && <span className="mt-1 block text-[11px] font-semibold text-red-600">{fieldErrors.firstName}</span>}
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      MIDDLE NAME
                    </label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={form.middleName}
                      onChange={(e) => set('middleName', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      LAST NAME <span className="text-[#ff5470]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={form.lastName}
                      onChange={(e) => set('lastName', e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:text-white ${
                        fieldErrors.lastName
                          ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/20'
                          : 'border-[#e5e9f2] bg-[#fdf8f2] focus:border-[#c66328] dark:border-white/10 dark:bg-[#1a1a1a]'
                      }`}
                    />
                    {fieldErrors.lastName && <span className="mt-1 block text-[11px] font-semibold text-red-600">{fieldErrors.lastName}</span>}
                  </div>
                </div>

                {/* Gender + Blood Group + Marital Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      GENDER
                    </label>
                    <select
                      value={String(form.gender)}
                      onChange={(e) => set('gender', Number(e.target.value) as Gender)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      {Object.entries(GENDER_LABELS).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      BLOOD GROUP
                    </label>
                    <select
                      value={form.bloodGroup}
                      onChange={(e) => set('bloodGroup', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">e.g. O+</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                    <span className="mt-1 block text-[10.5px] text-[#8a94ad]">Used for emergency & lab matching</span>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      MARITAL STATUS
                    </label>
                    <select
                      value={form.maritalStatusId}
                      onChange={(e) => set('maritalStatusId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— Select —</option>
                      {maritalStatuses.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Age & Date of Birth */}
                <div>
                  <div className="mb-2 flex items-center gap-4">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      AGE <span className="text-[#ff5470]">*</span>
                    </span>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#33415e] dark:text-[#c2cdf3] cursor-pointer">
                      <input
                        type="radio"
                        checked={form.dobKnown}
                        onChange={() => set('dobKnown', true)}
                        className="accent-[#c66328]"
                      />
                      Date of birth
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#33415e] dark:text-[#c2cdf3] cursor-pointer">
                      <input
                        type="radio"
                        checked={!form.dobKnown}
                        onChange={() => set('dobKnown', false)}
                        className="accent-[#c66328]"
                      />
                      Estimated age
                    </label>
                  </div>

                  <div className="relative">
                    {form.dobKnown ? (
                      <div className="relative">
                        <input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(e) => set('dateOfBirth', e.target.value)}
                          className={`w-full rounded-xl border p-2.5 pr-24 text-sm outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:text-white ${
                            fieldErrors.dateOfBirth
                              ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/20'
                              : 'border-[#e5e9f2] bg-[#fdf8f2] focus:border-[#c66328] dark:border-white/10 dark:bg-[#1a1a1a]'
                          }`}
                        />
                        {calculatedDobAge !== null && (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#0a1330] px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                            {calculatedDobAge} yrs
                          </span>
                        )}
                      </div>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={130}
                        placeholder="e.g. 34"
                        value={form.estimatedAge}
                        onChange={(e) => set('estimatedAge', e.target.value)}
                        className={`w-full rounded-xl border p-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:text-white ${
                          fieldErrors.estimatedAge
                            ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/20'
                            : 'border-[#e5e9f2] bg-[#fdf8f2] focus:border-[#c66328] dark:border-white/10 dark:bg-[#1a1a1a]'
                        }`}
                      />
                    )}
                  </div>
                  <span className="mt-1 block text-[10.5px] text-[#8a94ad]">
                    Format dd-mm-yyyy • age auto-calculates for tokens & dosage
                  </span>
                  {(fieldErrors.dateOfBirth || fieldErrors.estimatedAge) && (
                    <span className="mt-1 block text-[11px] font-semibold text-red-600">
                      {fieldErrors.dateOfBirth ?? fieldErrors.estimatedAge}
                    </span>
                  )}
                </div>

                {/* Language */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                    LANGUAGE
                  </label>
                  <select
                    value={form.languageId}
                    onChange={(e) => set('languageId', e.target.value)}
                    className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                  >
                    <option value="">— Select preferred language —</option>
                    {languages.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {/* Patient Case Type + Patient Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      PATIENT CASE TYPE
                    </label>
                    <select
                      value={form.patientCaseTypeId}
                      onChange={(e) => set('patientCaseTypeId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— Select —</option>
                      {patientCaseTypes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      PATIENT TAG
                    </label>
                    <select
                      value={form.patientHcTagId}
                      onChange={(e) => set('patientHcTagId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— Select —</option>
                      {patientHcTags.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Specially Abled Category */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                    SPECIALLY ABLED CATEGORY
                  </label>
                  <select
                    value={form.speciallyAbledCategoryId}
                    onChange={(e) => set('speciallyAbledCategoryId', e.target.value)}
                    className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                  >
                    <option value="">— None —</option>
                    {speciallyAbledCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Interactive Switches: VIP & SMS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div
                    onClick={() => set('isVip', !form.isVip)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all select-none ${
                      form.isVip
                        ? 'border-[#c6a15b] bg-[#fffbf0] shadow-[0_0_0_4px_rgba(198,161,91,0.16)] dark:border-[#c6a15b] dark:bg-[#2b2413]'
                        : 'border-[#e5e9f2] bg-[#fdf8f2] hover:border-[#c6d0e8] dark:border-white/10 dark:bg-[#1a1a1a]'
                    }`}
                  >
                    <div
                      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                        form.isVip ? 'bg-gradient-to-r from-[#c6a15b] to-[#e6ca85]' : 'bg-[#e2dacf] dark:bg-[#2a3763]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                          form.isVip ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <div>
                      <b className="flex items-center gap-1.5 text-xs font-bold text-[#191919] dark:text-white">
                        <span className="flex size-5 items-center justify-center rounded-[6px] bg-gradient-to-br from-[#ffe9b0] to-[#c6a15b] text-[#5b430a]">
                          ♛
                        </span>
                        VIP Patient
                      </b>
                      <small className="text-[11px] text-[#67748e] dark:text-[#a09a90]">
                        Priority queue & lounge access
                      </small>
                    </div>
                  </div>

                  <div
                    onClick={() => set('smsOptIn', !form.smsOptIn)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all select-none ${
                      form.smsOptIn
                        ? 'border-[#c66328] bg-[#f8ece5] shadow-[0_0_0_4px_rgba(35,72,255,0.1)] dark:border-[#3b82f6] dark:bg-[#16213e]'
                        : 'border-[#e5e9f2] bg-[#fdf8f2] hover:border-[#c6d0e8] dark:border-white/10 dark:bg-[#1a1a1a]'
                    }`}
                  >
                    <div
                      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                        form.smsOptIn ? 'bg-gradient-to-r from-[#c66328] to-[#c6a15b]' : 'bg-[#e2dacf] dark:bg-[#2a3763]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                          form.smsOptIn ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <div>
                      <b className="block text-xs font-bold text-[#191919] dark:text-white">✉ SMS Updates</b>
                      <small className="text-[11px] text-[#67748e] dark:text-[#a09a90]">
                        Token, reports & payment alerts
                      </small>
                    </div>
                  </div>
                </div>

                {/* Occupation + Income + Mother's Name */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      OCCUPATION
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Teacher"
                      value={form.occupation}
                      onChange={(e) => set('occupation', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      MONTHLY INCOME
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. ₹ 45,000"
                      value={form.monthlyIncome}
                      onChange={(e) => set('monthlyIncome', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      MOTHER'S NAME
                    </label>
                    <input
                      type="text"
                      placeholder="For minor / verification"
                      value={form.motherName}
                      onChange={(e) => set('motherName', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: Contact & Address */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      MOBILE NUMBER <span className="text-[#ff5470]">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 ••••• •••••"
                      value={form.mobile}
                      onChange={(e) => set('mobile', e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:text-white ${
                        fieldErrors.mobile
                          ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/20'
                          : 'border-[#e5e9f2] bg-[#fdf8f2] focus:border-[#c66328] dark:border-white/10 dark:bg-[#1a1a1a]'
                      }`}
                    />
                    {fieldErrors.mobile && <span className="mt-1 block text-[11px] font-semibold text-red-600">{fieldErrors.mobile}</span>}
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      ALTERNATE PHONE
                    </label>
                    <input
                      type="tel"
                      placeholder="Optional"
                      value={form.alternateMobile}
                      onChange={(e) => set('alternateMobile', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      WHATSAPP NUMBER
                    </label>
                    <input
                      type="tel"
                      placeholder="Optional"
                      value={form.whatsAppNumber}
                      onChange={(e) => set('whatsAppNumber', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                  />
                  {fieldErrors.email && <span className="mt-1 block text-[11px] font-semibold text-red-600">{fieldErrors.email}</span>}
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                    PRESENT ADDRESS
                  </label>
                  <input
                    type="text"
                    placeholder="Flat / Building / Street address"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                  />
                </div>

                <div className="rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-3 dark:border-white/10 dark:bg-[#1a1a1a]">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#191919] dark:text-white">
                    <input
                      type="checkbox"
                      checked={form.isPermanentSameAsPresent}
                      onChange={(e) => set('isPermanentSameAsPresent', e.target.checked)}
                      className="accent-[#c66328]"
                    />
                    Permanent address same as present address
                  </label>
                  {!form.isPermanentSameAsPresent && (
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Permanent flat / street address"
                        value={form.permanentAddress}
                        onChange={(e) => set('permanentAddress', e.target.value)}
                        className="w-full rounded-xl border border-[#e5e9f2] bg-white p-2.5 text-sm text-[#191919] outline-none focus:border-[#c66328] dark:border-white/10 dark:bg-[#191919] dark:text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Country + Nationality + Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      COUNTRY
                    </label>
                    <select
                      value={form.countryId}
                      onChange={(e) => set('countryId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— India —</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      NATIONALITY
                    </label>
                    <select
                      value={form.nationalityId}
                      onChange={(e) => set('nationalityId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— Indian —</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      PINCODE
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 411001"
                      value={form.pincode}
                      onChange={(e) => set('pincode', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>
                </div>

                {/* State + City + Area */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      STATE
                    </label>
                    <select
                      value={form.stateId}
                      onChange={(e) => set('stateId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— Select State —</option>
                      {states.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      CITY
                    </label>
                    <select
                      value={form.cityId}
                      onChange={(e) => {
                        set('cityId', e.target.value)
                        set('areaId', '')
                      }}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— Select City —</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      AREA / LOCALITY
                    </label>
                    <select
                      value={form.areaId}
                      onChange={(e) => set('areaId', e.target.value)}
                      disabled={!form.cityId}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white disabled:opacity-50"
                    >
                      <option value="">— Select Area —</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Patient Category + Referrer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      PATIENT CATEGORY
                    </label>
                    <select
                      value={form.patientCategoryId}
                      onChange={(e) => set('patientCategoryId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— None —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                      REFERRER
                    </label>
                    <select
                      value={form.referrerId}
                      onChange={(e) => set('referrerId', e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    >
                      <option value="">— None —</option>
                      {(referrersResult?.items ?? []).map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:text-[#a09a90]">
                    SPECIAL REMARKS / NOTES
                  </label>
                  <input
                    type="text"
                    placeholder="Optional notes"
                    value={form.remarks}
                    onChange={(e) => set('remarks', e.target.value)}
                    className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-2.5 text-sm text-[#191919] outline-none transition-all focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Guardian, IDs & Insurance */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Guardian / Attender */}
                <div className="rounded-2xl border border-[#e5e9f2] bg-[#fdf8f2] p-4.5 dark:border-white/10 dark:bg-[#1a1a1a]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <b className="block text-sm font-bold text-[#191919] dark:text-white">Guardian / Attender</b>
                      <small className="text-xs text-[#67748e] dark:text-[#a09a90]">Primary contact & kin details</small>
                    </div>
                    <button
                      type="button"
                      onClick={addContact}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e9f2] bg-white px-3 py-1.5 text-xs font-bold text-[#c66328] shadow-sm hover:border-[#c66328] dark:border-white/10 dark:bg-white/5 dark:text-[#e0a989] transition-all"
                    >
                      <Plus className="size-3.5" /> Add Contact
                    </button>
                  </div>

                  {form.contacts.length === 0 && (
                    <p className="rounded-xl border border-dashed border-[#eed0be] bg-white/50 p-4 text-center text-xs text-[#8a94ad] dark:border-white/10 dark:bg-white/5">
                      No guardian or attender added yet. Click "+ Add Contact" if applicable.
                    </p>
                  )}

                  <div className="space-y-3">
                    {form.contacts.map((contact, index) => (
                      <div key={index} className="rounded-xl border border-[#e5e9f2] bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#191919]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 text-[10.5px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">TYPE</label>
                            <select
                              value={String(contact.contactType)}
                              onChange={(e) => updateContact(index, { contactType: Number(e.target.value) as ContactType })}
                              className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                            >
                              {Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 text-[10.5px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">NAME *</label>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(e) => updateContact(index, { name: e.target.value })}
                              className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                            />
                            {fieldErrors[`contact-${index}-name`] && (
                              <span className="text-[10px] text-red-600">{fieldErrors[`contact-${index}-name`]}</span>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 text-[10.5px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">RELATIONSHIP</label>
                            <input
                              type="text"
                              placeholder="e.g. Father, Spouse"
                              value={contact.relationship ?? ''}
                              onChange={(e) => updateContact(index, { relationship: e.target.value })}
                              className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="mb-1 text-[10.5px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">PHONE</label>
                            <input
                              type="tel"
                              value={contact.phone ?? ''}
                              onChange={(e) => updateContact(index, { phone: e.target.value })}
                              className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-[#eef1f7] pt-2.5 dark:border-white/5">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#33415e] dark:text-[#c2cdf3]">
                            <input
                              type="checkbox"
                              checked={contact.isPrimary}
                              onChange={(e) => updateContact(index, { isPrimary: e.target.checked })}
                              className="accent-[#c66328]"
                            />
                            Primary contact
                          </label>
                          <button
                            type="button"
                            onClick={() => removeContact(index)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="size-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Identity Documents */}
                <div className="rounded-2xl border border-[#e5e9f2] bg-[#fdf8f2] p-4.5 dark:border-white/10 dark:bg-[#1a1a1a]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <b className="block text-sm font-bold text-[#191919] dark:text-white">Identity Documents</b>
                      <small className="text-xs text-[#67748e] dark:text-[#a09a90]">Aadhaar, ABHA, Passport, Voter ID</small>
                    </div>
                    <button
                      type="button"
                      onClick={addIdentifier}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e9f2] bg-white px-3 py-1.5 text-xs font-bold text-[#c66328] shadow-sm hover:border-[#c66328] dark:border-white/10 dark:bg-white/5 dark:text-[#e0a989] transition-all"
                    >
                      <Plus className="size-3.5" /> Add ID
                    </button>
                  </div>

                  {form.identifiers.length === 0 && (
                    <p className="rounded-xl border border-dashed border-[#eed0be] bg-white/50 p-4 text-center text-xs text-[#8a94ad] dark:border-white/10 dark:bg-white/5">
                      No identity documents added.
                    </p>
                  )}

                  <div className="space-y-2.5">
                    {form.identifiers.map((identifier, index) => (
                      <div key={index} className="flex flex-wrap items-end gap-2 rounded-xl border border-[#e5e9f2] bg-white p-3 dark:border-white/10 dark:bg-[#191919]">
                        <div className="w-32">
                          <label className="mb-1 text-[10px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">TYPE</label>
                          <select
                            value={String(identifier.type)}
                            onChange={(e) => updateIdentifier(index, { type: Number(e.target.value) as IdentifierType })}
                            className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                          >
                            {Object.entries(IDENTIFIER_TYPE_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </div>

                        {identifier.type === IDENTIFIER_TYPES.Other && (
                          <div className="w-40">
                            <label className="mb-1 text-[10px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">DOC TYPE</label>
                            <select
                              value={identifier.identityDocumentTypeId ?? ''}
                              onChange={(e) => updateIdentifier(index, { identityDocumentTypeId: e.target.value ? Number(e.target.value) : null })}
                              className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                            >
                              <option value="">— Select —</option>
                              {identityDocumentTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex-1 min-w-[140px]">
                          <label className="mb-1 text-[10px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">ID NUMBER *</label>
                          <input
                            type="text"
                            placeholder="Enter document number"
                            value={identifier.value}
                            onChange={(e) => updateIdentifier(index, { value: e.target.value })}
                            className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeIdentifier(index)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insurance Policies */}
                <div className="rounded-2xl border border-[#e5e9f2] bg-[#fdf8f2] p-4.5 dark:border-white/10 dark:bg-[#1a1a1a]">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#191919] dark:text-white">
                    <input
                      type="checkbox"
                      checked={form.insuranceRequired}
                      onChange={(e) => set('insuranceRequired', e.target.checked)}
                      className="size-4 accent-[#c66328]"
                    />
                    Insurance / TPA Coverage Required
                  </label>

                  {form.insuranceRequired && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#67748e] dark:text-[#a09a90]">Add active insurance cards</span>
                        <button
                          type="button"
                          onClick={addInsurancePolicy}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#e5e9f2] bg-white px-2.5 py-1 text-xs font-bold text-[#c66328] shadow-sm hover:border-[#c66328] dark:border-white/10 dark:bg-white/5 dark:text-[#e0a989]"
                        >
                          <Plus className="size-3" /> Add Policy
                        </button>
                      </div>

                      {fieldErrors.insurancePolicies && (
                        <p className="text-xs font-semibold text-red-600">{fieldErrors.insurancePolicies}</p>
                      )}

                      {form.insurancePolicies.map((policy, index) => (
                        <div key={index} className="flex flex-wrap items-end gap-2 rounded-xl border border-[#e5e9f2] bg-white p-3 dark:border-white/10 dark:bg-[#191919]">
                          <div className="flex-1 min-w-[160px]">
                            <label className="mb-1 text-[10px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">INSURER / TPA *</label>
                            <select
                              value={policy.insuranceCompanyId || ''}
                              onChange={(e) => updateInsurancePolicy(index, { insuranceCompanyId: Number(e.target.value) })}
                              className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                            >
                              <option value="">— Select Insurer —</option>
                              {insuranceCompanies.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex-1 min-w-[140px]">
                            <label className="mb-1 text-[10px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">POLICY NUMBER *</label>
                            <input
                              type="text"
                              placeholder="Policy / Card number"
                              value={policy.policyNumber}
                              onChange={(e) => updateInsurancePolicy(index, { policyNumber: e.target.value })}
                              className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                            />
                          </div>

                          <div className="w-36">
                            <label className="mb-1 text-[10px] font-extrabold uppercase text-[#67748e] dark:text-[#a09a90]">VALID TO</label>
                            <input
                              type="date"
                              value={policy.policyValidTo ?? ''}
                              onChange={(e) => updateInsurancePolicy(index, { policyValidTo: e.target.value || null })}
                              className="w-full rounded-lg border border-[#e5e9f2] bg-[#fdf8f2] p-2 text-xs text-[#191919] outline-none dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeInsurancePolicy(index)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Review & Confirm */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Photo Capture */}
                <div className="rounded-2xl border border-[#e5e9f2] bg-[#fdf8f2] p-4.5 dark:border-white/10 dark:bg-[#1a1a1a]">
                  <b className="mb-2 block text-xs font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                    PATIENT PHOTO (OPTIONAL)
                  </b>
                  <PatientPhotoCapture patientId={null} personLabel="new-patient" onCaptured={setPhotoFile} compact />
                </div>

                {/* Summary Box */}
                <div className="rounded-2xl border border-[#eed0be] bg-[#fdf8f2] p-5 text-center dark:border-white/10 dark:bg-[#1a1a1a]">
                  <b className="text-sm font-bold text-[#191919] dark:text-white">
                    Review summary, capture consent & generate OP slip.
                  </b>
                  <p className="mt-1 text-xs text-[#67748e] dark:text-[#a09a90]">
                    All required demographic details completed. Click Finish to finalize and generate token.
                  </p>
                  <div className="mt-3.5 flex flex-wrap justify-center gap-2">
                    <span className="rounded-full border border-[#eed0be] bg-[#fdf8f2] px-3 py-1 text-xs font-bold text-[#c66328] dark:border-[#203a9e] dark:bg-[#1a2b66] dark:text-[#e0a989]">
                      Consent ✔
                    </span>
                    <span className="rounded-full border border-[#eed0be] bg-[#f8ece5] px-3 py-1 text-xs font-bold text-[#9e4f20] dark:border-[#9e4f20]/40 dark:bg-[#2e1d12] dark:text-[#e0a989]">
                      ABHA ✔
                    </span>
                    <span className="rounded-full border border-[#ffe9b0] bg-[#fffbf0] px-3 py-1 text-xs font-bold text-[#9a7a2e] dark:border-[#5c4a16] dark:bg-[#2b2413] dark:text-[#d8b96a]">
                      Token Ready ⏳
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Sticky Footer */}
          <div className="flex items-center gap-3 border-t border-[#eef1f7] bg-[#fbfcff] px-5 sm:px-6 py-4 dark:border-white/8 dark:bg-[#101736]">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e9f2] bg-white px-4 py-2.5 text-xs font-bold text-[#33415e] shadow-sm hover:border-[#b9c4e2] disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white transition-all"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5 mx-auto">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === step
                      ? 'w-6 bg-gradient-to-r from-[#c66328] to-[#c6a15b]'
                      : 'w-2 bg-[#e2dacf] dark:bg-[#2a3763]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => showToast('Draft saved', 'You can resume from Front Office → Drafts.')}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#67748e] hover:text-[#191919] dark:text-[#a09a90] dark:hover:text-white transition-colors"
            >
              <Save className="size-3.5" /> Save draft
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#c66328] to-[#9e4f20] px-5 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_-6px_rgba(198,99,40,0.7)] hover:shadow-lg transition-all"
              >
                Next <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={checkAndRegister}
                disabled={checkDuplicates.isPending || register.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#c66328] to-[#9e4f20] px-5 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_-6px_rgba(198,99,40,0.7)] hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {checkDuplicates.isPending || register.isPending ? 'Registering...' : '✓ Finish Registration'}
              </button>
            )}
          </div>
        </section>

        {/* RIGHT SIDEBAR PREVIEW & METER RAIL */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          {/* Live Preview Card */}
          <div className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#191919] via-[#9e4f20] to-[#c66328] p-4.5 text-white">
              <small className="block text-[9.5px] font-extrabold tracking-widest text-[#f5ede0] uppercase">
                LIVE PREVIEW
              </small>
              <div className="font-display mt-1 text-lg font-bold leading-tight truncate pr-14">
                {fullName}
              </div>
              <div className="mt-0.5 text-xs text-[#eed0be] truncate">
                {ageDisplay} • {GENDER_LABELS[form.gender]} • Blood {form.bloodGroup || '—'}
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#f8ece5] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20]">
                  {selectedCaseType}
                </span>
                <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 text-[10.5px] font-extrabold text-white">
                  {selectedTag}
                </span>
                {form.isVip && (
                  <span className="rounded-full bg-gradient-to-r from-[#ffe9b0] to-[#d8b96a] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#4a3605]">
                    ★ VIP
                  </span>
                )}
              </div>

              {/* Patient Initials avatar */}
              <div className="font-display absolute right-4 top-4 flex size-12 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-base font-extrabold backdrop-blur-md">
                {initials}
              </div>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-dashed border-[#e7ebf5] pb-2 dark:border-white/8">
                <span className="text-[#67748e] dark:text-[#a09a90]">UHID</span>
                <b className="font-bold text-[#191919] dark:text-white">PRV-2026-08417</b>
              </div>
              <div className="flex justify-between border-b border-dashed border-[#e7ebf5] pb-2 dark:border-white/8">
                <span className="text-[#67748e] dark:text-[#a09a90]">Visit</span>
                <b className="font-bold text-[#191919] dark:text-white">OP • General • Token 249</b>
              </div>
              <div className="flex justify-between border-b border-dashed border-[#e7ebf5] pb-2 dark:border-white/8">
                <span className="text-[#67748e] dark:text-[#a09a90]">Language</span>
                <b className="font-bold text-[#191919] dark:text-white">{selectedLanguage}</b>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-[#67748e] dark:text-[#a09a90]">SMS alerts</span>
                <b className="font-bold text-[#191919] dark:text-white">{form.smsOptIn ? 'On' : 'Off'}</b>
              </div>
            </div>
          </div>

          {/* Form Completeness Meter Card */}
          <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-4.5 shadow-sm dark:border-white/8 dark:bg-[#191919]">
            <h4 className="text-xs font-bold text-[#191919] dark:text-white">Form completeness</h4>
            <p className="mt-0.5 text-[11.5px] text-[#67748e] dark:text-[#a09a90]">
              {score}% — {score < 50 ? 'add name & age to generate UHID' : score < 85 ? 'looking good — continue to contact' : 'ready for review & print'}
            </p>
            <div className="my-2.5 h-2 overflow-hidden rounded-full bg-[#f0eae2] dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#c6a15b] via-[#c6a15b] to-[#c66328] transition-all duration-300"
                style={{ width: `${score}%` }}
              />
            </div>
            <ul className="space-y-2 pt-1 text-xs">
              <li className={`flex items-center gap-2 ${checks.name ? 'font-semibold text-[#191919] dark:text-white' : 'text-[#67748e] dark:text-[#a09a90]'}`}>
                <span className={`flex size-4.5 items-center justify-center rounded-full text-[10px] font-extrabold ${checks.name ? 'bg-[#f8ece5] text-[#9e4f20] dark:bg-[#2e1d12] dark:text-[#c6a15b]' : 'bg-[#f0eae2] text-[#8a94ad] dark:bg-white/10'}`}>
                  ✓
                </span>
                Patient full name
              </li>
              <li className={`flex items-center gap-2 ${checks.age ? 'font-semibold text-[#191919] dark:text-white' : 'text-[#67748e] dark:text-[#a09a90]'}`}>
                <span className={`flex size-4.5 items-center justify-center rounded-full text-[10px] font-extrabold ${checks.age ? 'bg-[#f8ece5] text-[#9e4f20] dark:bg-[#2e1d12] dark:text-[#c6a15b]' : 'bg-[#f0eae2] text-[#8a94ad] dark:bg-white/10'}`}>
                  ✓
                </span>
                Age / date of birth
              </li>
              <li className={`flex items-center gap-2 ${checks.blood ? 'font-semibold text-[#191919] dark:text-white' : 'text-[#67748e] dark:text-[#a09a90]'}`}>
                <span className={`flex size-4.5 items-center justify-center rounded-full text-[10px] font-extrabold ${checks.blood ? 'bg-[#f8ece5] text-[#9e4f20] dark:bg-[#2e1d12] dark:text-[#c6a15b]' : 'bg-[#f0eae2] text-[#8a94ad] dark:bg-white/10'}`}>
                  ✓
                </span>
                Blood group
              </li>
              <li className={`flex items-center gap-2 ${checks.contact ? 'font-semibold text-[#191919] dark:text-white' : 'text-[#67748e] dark:text-[#a09a90]'}`}>
                <span className={`flex size-4.5 items-center justify-center rounded-full text-[10px] font-extrabold ${checks.contact ? 'bg-[#f8ece5] text-[#9e4f20] dark:bg-[#2e1d12] dark:text-[#c6a15b]' : 'bg-[#f0eae2] text-[#8a94ad] dark:bg-white/10'}`}>
                  ✓
                </span>
                Contact (mobile number)
              </li>
            </ul>
          </div>

          {/* Need Help at Counter Card */}
          <div className="rounded-[18px] border border-[#1c2f7a] bg-gradient-to-b from-[#0e1c48] to-[#16286e] p-4.5 text-[#dbe3ff] shadow-sm">
            <h4 className="text-xs font-bold text-white">Need help at counter?</h4>
            <p className="mt-1 text-[11.5px] text-[#a9b6e2] leading-relaxed">
              ABHA, insurance & MLC need extra documents. Keep Aadhaar + referral ready.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => showToast('Counter SOP', 'ABHA → consent → payment → token.')}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-all"
              >
                View SOP
              </button>
              <button
                type="button"
                onClick={() => showToast('Supervisor paged', 'Desk support in ~2 min.')}
                className="flex-1 rounded-xl bg-white py-1.5 text-xs font-bold text-[#16286e] shadow-sm hover:bg-[#fdf8f2] transition-all"
              >
                Call supervisor
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Toast popup */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-2xl border border-white/15 bg-[#0a1330] p-3.5 text-white shadow-2xl animate-fade-in max-w-sm">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#c6a15b] to-[#c66328] text-white">
            <Check className="size-4 stroke-[3]" />
          </div>
          <div>
            <b className="block text-xs font-bold">{toastMsg.title}</b>
            {toastMsg.sub && <span className="text-[11px] text-[#a9b6e2]">{toastMsg.sub}</span>}
          </div>
        </div>
      )}

      {/* Duplicate warning modal */}
      {duplicates && (
        <DuplicateWarningModal
          candidates={duplicates}
          loading={register.isPending}
          onCancel={() => setDuplicates(null)}
          onProceed={async () => {
            await submitRegistration(true)
            setDuplicates(null)
          }}
        />
      )}
    </div>
  )
}
