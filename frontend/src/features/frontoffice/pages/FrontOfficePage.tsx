import { ArrowRight, Bed, CalendarClock, ClipboardList, Siren, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../../../api/axios'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { compactErrors, hasErrors, requiredSelect, type FieldErrors } from '../../../lib/formValidation'
import { PatientPicker } from '../../appointments/components/PatientPicker'
import { useAppointments, useCheckInAppointment } from '../../appointments/api'
import { APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from '../../appointments/types'
import { useAuth } from '../../auth/AuthContext'
import { useEmergencyQueue } from '../../er/api'
import { useBedOccupancy } from '../../ipd/api'
import { doctorsForDepartment, useClinicalDepartments, useDoctors } from '../../masters/api'
import { useOpVisits, useRegisterOpVisit } from '../../opd/api'
import type { PatientListItem } from '../../patients/types'

const today = () => new Date().toISOString().slice(0, 10)

const appointmentStatusTone: Record<AppointmentStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  1: 'info', 2: 'success', 3: 'neutral', 4: 'danger', 5: 'warning',
}

export function FrontOfficePage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()

  const canViewOp = hasPermission('OPD.VISIT.VIEW')
  const canViewAppt = hasPermission('APPOINTMENT.APPOINTMENT.VIEW')
  const canCheckIn = hasPermission('APPOINTMENT.APPOINTMENT.CHECKIN')
  const canViewEr = hasPermission('EMERGENCY.VISIT.VIEW')
  const canViewBeds = hasPermission('IPD.BED.VIEW')
  const canRegisterVisit = hasPermission('OPD.VISIT.CREATE')
  const canRegisterPatient = hasPermission('PATIENT.PATIENT.CREATE')

  return (
    <div className="space-y-5">
      {/* Top Tabs Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-[11px] border border-[#e5e9f2] bg-white px-3 py-[7px] text-[12px] font-bold text-[#1a34c8] shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] dark:border-white/10 dark:bg-[#121c38] dark:text-[#7a9aff]">
            <span className="grid size-5 place-items-center rounded-[7px] bg-[#e9edff] text-[11px] text-[#2348ff] dark:bg-[#1e2a52]">◈</span>
            Front Office
          </span>
          <span className="text-[12px] text-[#8a94ad]">Daily reception &amp; patient intake workspace</span>
        </div>
        {canRegisterPatient && (
          <button
            type="button"
            onClick={() => navigate('/patients/new')}
            className="inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-[#2b54ff] to-[#1a34c8] px-3.5 py-2 text-[12.5px] font-bold text-white shadow-[0_12px_22px_-10px_rgba(35,72,255,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5 active:translate-y-0"
          >
            <UserPlus className="size-3.5" aria-hidden />
            ＋ New Patient Registration
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {canViewOp && <OpWaitingTile onClick={() => navigate('/opd')} />}
        {canViewAppt && <AppointmentsTile onClick={() => navigate('/appointments')} />}
        {canViewEr && <ErQueueTile onClick={() => navigate('/emergency/queue')} />}
        {canViewBeds && <BedOccupancyTile onClick={() => navigate('/ipd/bed-board')} />}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {canRegisterVisit && <QuickVisitPanel canRegisterPatient={canRegisterPatient} />}
        {canViewAppt && <TodaysAppointmentsPanel canCheckIn={canCheckIn} />}
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {canViewOp && <QuickLink label="OPD Front Desk" onClick={() => navigate('/opd')} />}
        {canViewBeds && <QuickLink label="Live Ward Map" onClick={() => navigate('/ipd/bed-board')} />}
        {canViewEr && <QuickLink label="ER Queue" onClick={() => navigate('/emergency/queue')} />}
        {hasPermission('DASHBOARD.OP.VIEW') && <QuickLink label="OP Dashboard" onClick={() => navigate('/reports/op')} />}
        {hasPermission('DASHBOARD.IP.VIEW') && <QuickLink label="IP Dashboard" onClick={() => navigate('/reports/ip')} />}
        {hasPermission('DASHBOARD.BILLING.VIEW') && <QuickLink label="Billing Dashboard" onClick={() => navigate('/reports/billing')} />}
      </div>
    </div>
  )
}

function StatCard({
  label, value, accent, soft, sub, icon: Icon, onClick,
}: { label: string; value: string | number; accent: string; soft: string; sub: string; icon: typeof Bed; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-[16px] border border-[#e5e9f2] bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#141b31]"
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#9aa6c4]">{label}</p>
        <div
          className="flex size-7 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: soft, color: accent }}
        >
          <Icon className="size-3.5" aria-hidden />
        </div>
      </div>
      <p className="font-display mt-2 text-[26px] font-bold tracking-tight text-[#0e1b33] dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] text-[#8a94ad] dark:text-[#6f7b9c]">{sub}</p>
    </button>
  )
}

// Each tile owns its own query, gated by mounting only when the caller holds the matching
// permission — an ungated shared query would fire an unauthorized (403) request otherwise.
function OpWaitingTile({ onClick }: { onClick: () => void }) {
  const { data } = useOpVisits({ page: 1, pageSize: 1, status: 1, date: today() })
  return (
    <StatCard
      label="OPD Waiting"
      value={data?.totalCount ?? '—'}
      accent="#2348ff"
      soft="#e9edff"
      sub="Live token queue"
      icon={ClipboardList}
      onClick={onClick}
    />
  )
}

function AppointmentsTile({ onClick }: { onClick: () => void }) {
  const { data } = useAppointments({ page: 1, pageSize: 8, date: today() })
  return (
    <StatCard
      label="Today's Appointments"
      value={data?.totalCount ?? '—'}
      accent="#7a5bff"
      soft="#ece7ff"
      sub="Scheduled consultations"
      icon={CalendarClock}
      onClick={onClick}
    />
  )
}

function ErQueueTile({ onClick }: { onClick: () => void }) {
  const { data } = useEmergencyQueue({})
  return (
    <StatCard
      label="ER Queue"
      value={data?.length ?? '—'}
      accent="#ff5470"
      soft="#ffe3e8"
      sub="Emergency triage"
      icon={Siren}
      onClick={onClick}
    />
  )
}

function BedOccupancyTile({ onClick }: { onClick: () => void }) {
  const { data } = useBedOccupancy()
  return (
    <StatCard
      label="Bed Occupancy"
      value={data ? `${data.occupied}/${data.totalBeds}` : '—'}
      accent="#0eb7a2"
      soft="#d9f9f1"
      sub="Live ward beds"
      icon={Bed}
      onClick={onClick}
    />
  )
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-shell-sm border border-border-soft bg-panel-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink-muted hover:border-border-strong hover:text-ink"
    >
      {label}
      <ArrowRight className="size-3.5" aria-hidden />
    </button>
  )
}

function QuickVisitPanel({ canRegisterPatient }: { canRegisterPatient: boolean }) {
  const navigate = useNavigate()
  const [patient, setPatient] = useState<PatientListItem | null>(null)
  const [departmentId, setDepartmentId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { data: doctorsResult } = useDoctors({ page: 1, pageSize: 200 })
  const { data: clinicalDepartments = [] } = useClinicalDepartments()
  const departmentName = clinicalDepartments.find((d) => String(d.id) === departmentId)?.name
  const doctorOptions = doctorsForDepartment(doctorsResult?.items ?? [], departmentName)
  const register = useRegisterOpVisit()

  const submit = async () => {
    setError(null)
    const errors = compactErrors({
      patient: patient ? undefined : 'Select a patient.',
      departmentId: requiredSelect(departmentId, 'Department'),
      doctorId: requiredSelect(doctorId, 'Doctor'),
    })
    setFieldErrors(errors)
    if (hasErrors(errors)) return
    try {
      const visit = await register.mutateAsync({
        patientId: patient!.id, departmentId: Number(departmentId), doctorId: Number(doctorId), appointmentId: null,
      })
      navigate(`/opd/visits/${visit.id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)] dark:border-white/10 dark:bg-[#141b31]">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-[15px] font-bold text-[#0e1b33] dark:text-white">Register OPD Visit</p>
        {canRegisterPatient && (
          <button
            type="button"
            onClick={() => navigate('/patients/new')}
            className="flex items-center gap-1.5 rounded-[9px] bg-[#e9edff] px-2.5 py-1 text-[12px] font-bold text-[#2348ff] hover:bg-[#dce5ff] dark:bg-[#1e2a52] dark:text-[#7a9aff]"
          >
            <UserPlus className="size-3.5" aria-hidden />
            New patient
          </button>
        )}
      </div>
      {error && <p className="mb-3 rounded-[11px] bg-crit/10 px-3 py-2 text-sm text-crit">{error}</p>}
      <div className="flex flex-col gap-3">
        <div>
          <PatientPicker selected={patient} onSelect={setPatient} />
          {fieldErrors.patient && (
            <p role="alert" className="mt-1 text-xs font-medium text-crit">
              {fieldErrors.patient}
            </p>
          )}
        </div>
        <Select
          label="Department"
          required
          error={fieldErrors.departmentId}
          placeholder="Select a department…"
          options={clinicalDepartments.map((d) => ({ value: d.id, label: d.name }))}
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value)
            setDoctorId('')
          }}
        />
        <Select
          label="Doctor"
          required
          error={fieldErrors.doctorId}
          placeholder="Select a doctor…"
          options={doctorOptions.map((d) => ({ value: d.id, label: d.fullName }))}
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        />
        <Button
          loading={register.isPending}
          onClick={submit}
          className="mt-1 justify-center rounded-[12px] bg-gradient-to-br from-[#2b54ff] to-[#1a34c8] py-2.5 font-bold shadow-[0_12px_22px_-10px_rgba(35,72,255,0.7),inset_0_1px_0_rgba(255,255,255,0.35)]"
        >
          Register visit
        </Button>
      </div>
    </div>
  )
}

function TodaysAppointmentsPanel({ canCheckIn }: { canCheckIn: boolean }) {
  const { data } = useAppointments({ page: 1, pageSize: 8, date: today() })
  const checkIn = useCheckInAppointment()
  const appointments = data?.items ?? []

  return (
    <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)] dark:border-white/10 dark:bg-[#141b31]">
      <p className="mb-4 font-display text-[15px] font-bold text-[#0e1b33] dark:text-white">Today's Appointments</p>
      <div className="flex flex-col gap-2">
        {appointments.length === 0 && (
          <div className="rounded-[14px] border border-dashed border-[#e5e9f2] py-10 text-center text-sm text-[#8a94ad] dark:border-white/10">
            No appointments scheduled for today.
          </div>
        )}
        {appointments.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-[12px] border border-[#e5e9f2] bg-[#f8faff] px-3.5 py-2.5 transition-all hover:border-[#c6d0e8] dark:border-white/8 dark:bg-[#0f1830]"
          >
            <span className="font-mono text-xs font-bold text-[#2348ff]">#{a.tokenNumber}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[#0e1b33] dark:text-white">{a.patientName}</p>
              <p className="truncate text-[11px] text-[#67748e] dark:text-[#8fa0d6]">{a.doctorName} · {a.startTime}</p>
            </div>
            <StatusBadge tone={appointmentStatusTone[a.status]}>{APPOINTMENT_STATUS_LABELS[a.status]}</StatusBadge>
            {canCheckIn && a.status === 1 && (
              <Button variant="secondary" onClick={() => checkIn.mutate(a.id)} loading={checkIn.isPending}>
                Check in
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
