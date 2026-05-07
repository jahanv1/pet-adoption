import { useEffect, useState, useCallback, useRef } from 'react'
import Navbar from '../components/Navbar'
import DashboardBackground from '../components/DashboardBackground'
import StarField from '../components/StarField'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function pad(n) {
  return n.toString().padStart(2, '0')
}

const NAV_ITEMS = ['Overview', 'Health Screening', 'Staff', 'Vets', 'Donations', 'Fosters', 'Adoption Requests']

const BLANK_STAFF    = { name: '', position: '', contact_no: '', email: '', department: '', hire_date: '', qualification: '' }
const BLANK_VET      = { name: '', speciality: '', contact_no: '', email: '', license_no: '', years_exp: '', clinic: '', degree: '', availability: '' }
const BLANK_DONATION = { name: '', amount: '' }
const BLANK_FOSTER   = { name: '', number: '', duration: '', email: '', address: '', animals_fostered: '', home_type: '' }

const BLANK_FORM = {
  name: '', species: 'Dog', breed: '', age: '', gender: 'Male',
  dob: '', story: '', traits: '', status: 'available', image_url: '',
}

export default function ShelterDashboard() {
  const { user } = useAuth()
  const [animals, setAnimals]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [activeNav, setActiveNav]     = useState('Overview')

  // Login history
  const [loginHistory, setLoginHistory]           = useState([])
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false)

  // Detail modal state
  const [modalAnimal, setModalAnimal]   = useState(null)
  const [editing, setEditing]           = useState(false)
  const [editStory, setEditStory]       = useState('')
  const [editTraits, setEditTraits]     = useState('')
  const [editStatus, setEditStatus]     = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [editPhotoFile, setEditPhotoFile]     = useState(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState('')
  const editPhotoRef                          = useRef(null)

  // Add Animal modal state
  const [addOpen, setAddOpen]           = useState(false)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [addSaving, setAddSaving]       = useState(false)
  const [addError, setAddError]         = useState('')
  const fileInputRef                    = useRef(null)

  const openModal = (a) => {
    setModalAnimal(a)
    setEditing(false)
    setSaveError('')
    setConfirmDelete(false)
  }

  const closeModal = useCallback(() => {
    setModalAnimal(null)
    setEditing(false)
    setSaveError('')
    setConfirmDelete(false)
    setEditPhotoFile(null)
    setEditPhotoPreview('')
  }, [])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/animals/${modalAnimal.id}`)
      setAnimals(prev => prev.filter(a => a.id !== modalAnimal.id))
      closeModal()
    } catch (err) {
      setSaveError(err.message)
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const closeAdd = useCallback(() => {
    setAddOpen(false)
    setForm(BLANK_FORM)
    setPhotoFile(null)
    setPhotoPreview('')
    setAddError('')
  }, [])

  const startEdit = () => {
    setEditStory(modalAnimal.story || '')
    setEditTraits((modalAnimal.traits || []).join(', '))
    setEditStatus(modalAnimal.status || 'available')
    setEditPhotoFile(null)
    setEditPhotoPreview('')
    setEditing(true)
    setSaveError('')
  }

  const saveEdit = async () => {
    setSaving(true)
    setSaveError('')
    try {
      let image_url
      if (editPhotoFile) {
        const fd = new FormData()
        fd.append('file', editPhotoFile)
        const token = localStorage.getItem('token')
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/upload/`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }
        )
        if (!res.ok) throw new Error('Image upload failed')
        const json = await res.json()
        image_url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${json.url}`
      }

      const traits = editTraits.split(',').map(t => t.trim()).filter(Boolean)
      const payload = { story: editStory, traits, status: editStatus }
      if (image_url) payload.image_url = image_url

      const { data } = await api.patch(`/animals/${modalAnimal.id}/profile`, payload)
      setAnimals(prev => prev.map(a => a.id === data.id ? data : a))
      setModalAnimal(data)
      setEditing(false)
      setEditPhotoFile(null)
      setEditPhotoPreview('')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setAddSaving(true)
    setAddError('')
    try {
      let image_url = form.image_url

      // Upload file if one was selected
      if (photoFile) {
        const fd = new FormData()
        fd.append('file', photoFile)
        const token = localStorage.getItem('token')
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/upload/`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }
        )
        if (!res.ok) throw new Error('Image upload failed')
        const json = await res.json()
        // Make the URL absolute so it works from the frontend
        image_url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${json.url}`
      }

      const traits = form.traits.split(',').map(t => t.trim()).filter(Boolean)
      const { data } = await api.post('/animals/', {
        name:       form.name,
        species:    form.species,
        breed:      form.breed,
        age:        parseInt(form.age) || 0,
        gender:     form.gender,
        dob:        form.dob || null,
        status:     form.status,
        shelter_id: user?.id || 'demo_shelter',
        story:      form.story,
        traits,
        image_url,
        image_emoji: '🐾',
        description: form.story,
      })

      setAnimals(prev => [data, ...prev])
      closeAdd()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddSaving(false)
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (modalAnimal) closeModal()
        else if (addOpen) closeAdd()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeModal, closeAdd, modalAnimal, addOpen])

  // Staff state
  const [staff, setStaff]               = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffError, setStaffError]     = useState('')
  const [staffForm, setStaffForm]       = useState(BLANK_STAFF)
  const [staffAdding, setStaffAdding]   = useState(false)
  const [staffSaving, setStaffSaving]   = useState(false)
  const [staffFormErr, setStaffFormErr] = useState('')
  const [deletingStaff, setDeletingStaff] = useState(null)
  const [editingStaff, setEditingStaff]   = useState(null) // id of card in edit mode
  const [staffEditForm, setStaffEditForm] = useState(BLANK_STAFF)
  const [staffEditErr, setStaffEditErr]   = useState('')

  // Vet state
  const [vets, setVets]               = useState([])
  const [vetsLoading, setVetsLoading] = useState(false)
  const [vetsError, setVetsError]     = useState('')
  const [vetForm, setVetForm]         = useState(BLANK_VET)
  const [vetAdding, setVetAdding]     = useState(false)
  const [vetSaving, setVetSaving]     = useState(false)
  const [vetFormErr, setVetFormErr]   = useState('')
  const [deletingVet, setDeletingVet] = useState(null)
  const [editingVet, setEditingVet]   = useState(null)
  const [vetEditForm, setVetEditForm] = useState(BLANK_VET)
  const [vetEditErr, setVetEditErr]   = useState('')

  // Donations state
  const [donations, setDonations]             = useState([])
  const [donationsLoading, setDonationsLoading] = useState(false)
  const [donationsError, setDonationsError]   = useState('')
  const [donationForm, setDonationForm]       = useState(BLANK_DONATION)
  const [donationAdding, setDonationAdding]   = useState(false)
  const [donationSaving, setDonationSaving]   = useState(false)
  const [donationFormErr, setDonationFormErr] = useState('')
  const [deletingDonation, setDeletingDonation] = useState(null)
  const [editingDonation, setEditingDonation] = useState(null)
  const [donationEditForm, setDonationEditForm] = useState(BLANK_DONATION)
  const [donationEditErr, setDonationEditErr] = useState('')

  // Fosters state
  const [fosters, setFosters]               = useState([])
  const [fostersLoading, setFostersLoading] = useState(false)
  const [fostersError, setFostersError]     = useState('')
  const [fosterForm, setFosterForm]         = useState(BLANK_FOSTER)
  const [fosterAdding, setFosterAdding]     = useState(false)
  const [fosterSaving, setFosterSaving]     = useState(false)
  const [fosterFormErr, setFosterFormErr]   = useState('')
  const [deletingFoster, setDeletingFoster] = useState(null)
  const [editingFoster, setEditingFoster]   = useState(null)
  const [fosterEditForm, setFosterEditForm] = useState(BLANK_FOSTER)
  const [fosterEditErr, setFosterEditErr]   = useState('')

  // Adoption Requests state
  const [requests, setRequests]                   = useState([])
  const [requestsLoading, setRequestsLoading]     = useState(false)
  const [requestsError, setRequestsError]         = useState('')
  const [processingRequest, setProcessingRequest] = useState(null)
  const [reviewRequest, setReviewRequest]         = useState(null)  // request being reviewed
  const [reviewAdopter, setReviewAdopter]         = useState(null)  // { adopter, history }
  const [reviewLoading, setReviewLoading]         = useState(false)
  const [reviewBgCheck, setReviewBgCheck]         = useState(null)  // computed verdict
  const [editingProfile, setEditingProfile]       = useState(false)
  const [profileForm, setProfileForm]             = useState({})
  const [profileSaving, setProfileSaving]         = useState(false)
  const [profileErr, setProfileErr]               = useState('')
  const [editingMessage, setEditingMessage]       = useState(false)
  const [messageForm, setMessageForm]             = useState('')
  const [messageSaving, setMessageSaving]         = useState(false)
  const [messageErr, setMessageErr]               = useState('')

  // Bulk-select / remove mode state
  const [staffSelectMode, setStaffSelectMode]         = useState(false)
  const [staffSelected, setStaffSelected]             = useState(new Set())
  const [bulkDeletingStaff, setBulkDeletingStaff]     = useState(false)
  const [detailCard, setDetailCard]                   = useState(null) // { type: 'staff'|'vet'|'foster', data }
  const [vetSelectMode, setVetSelectMode]             = useState(false)
  const [vetSelected, setVetSelected]                 = useState(new Set())
  const [bulkDeletingVet, setBulkDeletingVet]         = useState(false)
  const [donationSelectMode, setDonationSelectMode]   = useState(false)
  const [donationSelected, setDonationSelected]       = useState(new Set())
  const [bulkDeletingDonation, setBulkDeletingDonation] = useState(false)
  const [fosterSelectMode, setFosterSelectMode]       = useState(false)
  const [fosterSelected, setFosterSelected]           = useState(new Set())
  const [bulkDeletingFoster, setBulkDeletingFoster]   = useState(false)

  // Health screening state
  const [selectedPet, setSelectedPet]       = useState('')
  const [healthData, setHealthData]         = useState(null)
  const [healthLoading, setHealthLoading]   = useState(false)
  const [healthError, setHealthError]       = useState('')
  const [healthEditing, setHealthEditing]   = useState(false)
  const [healthSaving, setHealthSaving]     = useState(false)
  const [healthSaveErr, setHealthSaveErr]   = useState('')
  const [editHealth, setEditHealth]         = useState(null)   // working copy
  const [confirmDelHealth, setConfirmDelHealth] = useState(false)

  useEffect(() => {
    api.get('/animals/')
      .then(({ data }) => setAnimals(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeNav !== 'Overview' || !user?.shelterId) return
    setLoginHistoryLoading(true)
    api.get(`/login-history/?shelter_id=${user.shelterId}`)
      .then(({ data }) => setLoginHistory(data.slice(0, 10)))
      .catch(() => setLoginHistory([]))
      .finally(() => setLoginHistoryLoading(false))
  }, [activeNav, user?.shelterId])

  const total     = animals.length
  const available = animals.filter((a) => a.status === 'available').length
  const adopted   = animals.filter((a) => a.status === 'adopted').length
  const fostered  = animals.filter((a) => a.status === 'fostered').length

  const [statusFilter, setStatusFilter] = useState(null)
  const filteredAnimals = statusFilter ? animals.filter(a => a.status === statusFilter) : animals

  const handleSelectPet = async (name) => {
    setSelectedPet(name)
    setHealthData(null)
    setHealthError('')
    setHealthEditing(false)
    setConfirmDelHealth(false)
    if (!name) return
    setHealthLoading(true)
    try {
      const { data } = await api.get(`/health/by-name/${encodeURIComponent(name)}`)
      setHealthData(data)
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('No health')) {
        setHealthData(null)
        setHealthError('no-record')
      } else {
        setHealthError(err.message)
      }
    } finally {
      setHealthLoading(false)
    }
  }

  const startHealthEdit = () => {
    setEditHealth({
      weight:       healthData.weight ?? '',
      temperature:  healthData.temperature ?? '',
      last_checkup: healthData.last_checkup ?? '',
      vet_name:     healthData.vet_name ?? '',
      vaccinations: healthData.vaccinations.map(v => ({ name: '', date_given: '', next_due: '', ...v })),
    })
    setHealthEditing(true)
    setHealthSaveErr('')
  }

  const startNewRecord = () => {
    setEditHealth({ weight: '', temperature: '', last_checkup: '', vet_name: '', vaccinations: [] })
    setHealthEditing(true)
    setHealthSaveErr('')
  }

  const updateVacc = (i, field, val) => {
    setEditHealth(h => {
      const vaccs = h.vaccinations.map((v, idx) => idx === i ? { ...v, [field]: val } : v)
      return { ...h, vaccinations: vaccs }
    })
  }

  const addVaccRow = () => {
    setEditHealth(h => ({ ...h, vaccinations: [...h.vaccinations, { name: '', date_given: '', next_due: '' }] }))
  }

  const removeVaccRow = (i) => {
    setEditHealth(h => ({ ...h, vaccinations: h.vaccinations.filter((_, idx) => idx !== i) }))
  }

  const saveHealthRecord = async () => {
    setHealthSaving(true)
    setHealthSaveErr('')
    try {
      const payload = {
        weight:       editHealth.weight === '' ? null : parseFloat(editHealth.weight),
        temperature:  editHealth.temperature === '' ? null : parseFloat(editHealth.temperature),
        last_checkup: editHealth.last_checkup || null,
        vet_name:     editHealth.vet_name,
        vaccinations: editHealth.vaccinations.filter(v => v.name?.trim()),
      }
      let data
      if (healthData) {
        ;({ data } = await api.patch(`/health/${healthData.id}`, payload))
      } else {
        const selectedAnimal = animals.find(a => a.name === selectedPet)
        ;({ data } = await api.post('/health/', { ...payload, animal_name: selectedPet, animal_id: selectedAnimal?.id }))
      }
      setHealthData(data)
      setHealthEditing(false)
      setHealthError('')
    } catch (err) {
      setHealthSaveErr(err.message)
    } finally {
      setHealthSaving(false)
    }
  }

  const deleteHealthRecord = async () => {
    setHealthSaving(true)
    try {
      await api.delete(`/health/${healthData.id}`)
      setHealthData(null)
      setHealthEditing(false)
      setConfirmDelHealth(false)
      setHealthError('no-record')
    } catch (err) {
      setHealthSaveErr(err.message)
    } finally {
      setHealthSaving(false)
    }
  }

  // Fetch staff when tab activates
  useEffect(() => {
    if (activeNav !== 'Staff' || !user?.shelterId) return
    setStaffLoading(true)
    setStaffError('')
    api.get(`/staff/?shelter_id=${user.shelterId}`)
      .then(({ data }) => setStaff(data))
      .catch((err) => setStaffError(err.message))
      .finally(() => setStaffLoading(false))
  }, [activeNav, user?.shelterId])

  const handleAddStaff = async (e) => {
    e.preventDefault()
    if (!staffForm.name.trim() || !staffForm.position.trim()) {
      setStaffFormErr('Name and position are required.')
      return
    }
    setStaffSaving(true)
    setStaffFormErr('')
    try {
      const { data } = await api.post('/staff/', staffForm)
      setStaff(prev => [...prev, data])
      setStaffForm(BLANK_STAFF)
      setStaffAdding(false)
    } catch (err) {
      setStaffFormErr(err.message)
    } finally {
      setStaffSaving(false)
    }
  }

  const handleDeleteStaff = async (id) => {
    setDeletingStaff(id)
    try {
      await api.delete(`/staff/${id}`)
      setStaff(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setStaffError(err.message)
    } finally {
      setDeletingStaff(null)
    }
  }

  const startEditStaff = (s) => {
    setEditingStaff(s.id)
    setStaffEditForm({ name: s.name, position: s.position, contact_no: s.contact_no, email: s.email, department: s.department || '', hire_date: s.hire_date || '', qualification: s.qualification || '' })
    setStaffEditErr('')
  }

  const saveEditStaff = async (id) => {
    setStaffEditErr('')
    try {
      const { data } = await api.patch(`/staff/${id}`, staffEditForm)
      setStaff(prev => prev.map(s => s.id === id ? data : s))
      setEditingStaff(null)
    } catch (err) {
      setStaffEditErr(err.message)
    }
  }

  // Fetch vets when Vets tab or Health Screening tab activates
  useEffect(() => {
    if ((activeNav !== 'Vets' && activeNav !== 'Health Screening') || !user?.shelterId) return
    setVetsLoading(true)
    setVetsError('')
    api.get(`/vet/?shelter_id=${user.shelterId}`)
      .then(({ data }) => setVets(data))
      .catch((err) => setVetsError(err.message))
      .finally(() => setVetsLoading(false))
  }, [activeNav, user?.shelterId])

  const handleAddVet = async (e) => {
    e.preventDefault()
    if (!vetForm.name.trim()) { setVetFormErr('Name is required.'); return }
    setVetSaving(true)
    setVetFormErr('')
    try {
      const { data } = await api.post('/vet/', vetForm)
      setVets(prev => [...prev, data])
      setVetForm(BLANK_VET)
      setVetAdding(false)
    } catch (err) {
      setVetFormErr(err.message)
    } finally {
      setVetSaving(false)
    }
  }

  const handleDeleteVet = async (id) => {
    setDeletingVet(id)
    try {
      await api.delete(`/vet/${id}`)
      setVets(prev => prev.filter(v => v.id !== id))
    } catch (err) {
      setVetsError(err.message)
    } finally {
      setDeletingVet(null)
    }
  }

  const startEditVet = (v) => {
    setEditingVet(v.id)
    setVetEditForm({ name: v.name, speciality: v.speciality, contact_no: v.contact_no, email: v.email, license_no: v.license_no || '', years_exp: v.years_exp != null ? String(v.years_exp) : '', clinic: v.clinic || '', degree: v.degree || '', availability: v.availability || '' })
    setVetEditErr('')
  }

  const saveEditVet = async (id) => {
    setVetEditErr('')
    try {
      const { data } = await api.patch(`/vet/${id}`, vetEditForm)
      setVets(prev => prev.map(v => v.id === id ? data : v))
      setEditingVet(null)
    } catch (err) {
      setVetEditErr(err.message)
    }
  }

  // Donations handlers
  useEffect(() => {
    if (activeNav !== 'Donations' || !user?.shelterId) return
    setDonationsLoading(true)
    setDonationsError('')
    api.get(`/donations/?shelter_id=${user.shelterId}`)
      .then(({ data }) => setDonations(data))
      .catch((err) => setDonationsError(err.message))
      .finally(() => setDonationsLoading(false))
  }, [activeNav, user?.shelterId])

  const handleAddDonation = async (e) => {
    e.preventDefault()
    if (!donationForm.name.trim()) { setDonationFormErr('Donor name is required.'); return }
    setDonationSaving(true)
    setDonationFormErr('')
    try {
      const { data } = await api.post('/donations/', {
        name: donationForm.name,
        amount: parseFloat(donationForm.amount) || 0,
      })
      setDonations(prev => [...prev, data])
      setDonationForm(BLANK_DONATION)
      setDonationAdding(false)
    } catch (err) {
      setDonationFormErr(err.message)
    } finally {
      setDonationSaving(false)
    }
  }

  const handleDeleteDonation = async (id) => {
    setDeletingDonation(id)
    try {
      await api.delete(`/donations/${id}`)
      setDonations(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setDonationsError(err.message)
    } finally {
      setDeletingDonation(null)
    }
  }

  const startEditDonation = (d) => {
    setEditingDonation(d.id)
    setDonationEditForm({ name: d.name, amount: String(d.amount) })
    setDonationEditErr('')
  }

  const saveEditDonation = async (id) => {
    setDonationEditErr('')
    try {
      const { data } = await api.patch(`/donations/${id}`, {
        name: donationEditForm.name,
        amount: parseFloat(donationEditForm.amount) || 0,
      })
      setDonations(prev => prev.map(d => d.id === id ? data : d))
      setEditingDonation(null)
    } catch (err) {
      setDonationEditErr(err.message)
    }
  }

  // Fosters handlers
  useEffect(() => {
    if (activeNav !== 'Fosters' || !user?.shelterId) return
    setFostersLoading(true)
    setFostersError('')
    api.get(`/fosters/?shelter_id=${user.shelterId}`)
      .then(({ data }) => setFosters(data))
      .catch((err) => setFostersError(err.message))
      .finally(() => setFostersLoading(false))
  }, [activeNav, user?.shelterId])

  const handleAddFoster = async (e) => {
    e.preventDefault()
    if (!fosterForm.name.trim()) { setFosterFormErr('Name is required.'); return }
    setFosterSaving(true)
    setFosterFormErr('')
    try {
      const { data } = await api.post('/fosters/', {
        name:     fosterForm.name,
        number:   fosterForm.number,
        duration: parseInt(fosterForm.duration) || 0,
        email:    fosterForm.email,
      })
      setFosters(prev => [...prev, data])
      setFosterForm(BLANK_FOSTER)
      setFosterAdding(false)
    } catch (err) {
      setFosterFormErr(err.message)
    } finally {
      setFosterSaving(false)
    }
  }

  const handleDeleteFoster = async (id) => {
    setDeletingFoster(id)
    try {
      await api.delete(`/fosters/${id}`)
      setFosters(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      setFostersError(err.message)
    } finally {
      setDeletingFoster(null)
    }
  }

  const startEditFoster = (f) => {
    setEditingFoster(f.id)
    setFosterEditForm({ name: f.name, number: f.number, duration: String(f.duration), email: f.email, address: f.address || '', animals_fostered: String(f.animals_fostered || 0), home_type: f.home_type || '' })
    setFosterEditErr('')
  }

  const saveEditFoster = async (id) => {
    setFosterEditErr('')
    try {
      const { data } = await api.patch(`/fosters/${id}`, {
        name:     fosterEditForm.name,
        number:   fosterEditForm.number,
        duration: parseInt(fosterEditForm.duration) || 0,
        email:    fosterEditForm.email,
      })
      setFosters(prev => prev.map(f => f.id === id ? data : f))
      setEditingFoster(null)
    } catch (err) {
      setFosterEditErr(err.message)
    }
  }

  // Fetch adoption requests when tab activates
  useEffect(() => {
    if (activeNav !== 'Adoption Requests' || !user?.shelterId) return
    setRequestsLoading(true)
    setRequestsError('')
    api.get(`/adoption/?shelter_id=${user.shelterId}`)
      .then(({ data }) => setRequests(data))
      .catch((err) => setRequestsError(err.message))
      .finally(() => setRequestsLoading(false))
  }, [activeNav, user?.shelterId])

  const handleAdoptionAction = async (id, status) => {
    setProcessingRequest(id)
    try {
      const { data } = await api.patch(`/adoption/${id}`, { status })
      setRequests(prev => prev.map(r => r.id === id ? data : r))
      if (reviewRequest?.id === id) setReviewRequest(data)
    } catch (err) {
      setRequestsError(err.message)
    } finally {
      setProcessingRequest(null)
    }
  }

  const computeBgCheck = (history) => {
    const approved = history.filter(h => h.status === 'approved').length
    const rejected = history.filter(h => h.status === 'rejected').length
    const pending  = history.filter(h => h.status === 'pending').length
    if (rejected >= 2 || pending >= 3) {
      return {
        verdict: 'FLAGGED', confidence: 'HIGH',
        summary: `${rejected} rejection(s) and ${pending} pending request(s). Pattern suggests unsuitable applications.`,
        flags: [
          ...(rejected >= 2 ? ['Multiple rejections'] : []),
          ...(pending  >= 3 ? ['Too many simultaneous pending requests'] : []),
        ],
      }
    }
    if (approved >= 1 && rejected === 0) {
      return {
        verdict: 'CLEARED', confidence: 'HIGH',
        summary: `${approved} approved adoption(s) and no rejections. Strong track record.`,
        flags: [],
      }
    }
    if (history.length === 0) {
      return {
        verdict: 'REVIEW', confidence: 'LOW',
        summary: 'No prior adoption history. Proceed with standard interview.',
        flags: ['No adoption history'],
      }
    }
    return {
      verdict: 'REVIEW', confidence: 'MEDIUM',
      summary: `Mixed history: ${approved} approved, ${rejected} rejected, ${pending} pending. Recommend manual review.`,
      flags: rejected >= 1 ? ['At least one prior rejection'] : [],
    }
  }

  const openReview = async (req) => {
    setReviewRequest(req)
    setReviewAdopter(null)
    setReviewBgCheck(null)
    setReviewLoading(true)
    try {
      const { data } = await api.get(`/adoption/adopter/${req.adopt_id}`)
      setReviewAdopter(data)
      setReviewBgCheck(computeBgCheck(data.history || []))
    } catch (err) {
      setReviewAdopter({ error: err.response?.data?.detail || err.message })
    } finally {
      setReviewLoading(false)
    }
  }

  const closeReview = () => {
    setReviewRequest(null)
    setReviewAdopter(null)
    setReviewBgCheck(null)
    setEditingProfile(false)
    setEditingMessage(false)
  }

  const saveProfile = async () => {
    setProfileSaving(true)
    setProfileErr('')
    try {
      const { data } = await api.patch(`/adoption/adopter/${reviewRequest.adopt_id}`, profileForm)
      setReviewAdopter(prev => ({ ...prev, adopter: data }))
      setEditingProfile(false)
    } catch (err) {
      setProfileErr(err.response?.data?.detail || err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  const saveMessage = async () => {
    setMessageSaving(true)
    setMessageErr('')
    try {
      const { data } = await api.patch(`/adoption/${reviewRequest.id}`, { message: messageForm })
      setReviewRequest(data)
      setRequests(prev => prev.map(r => r.id === data.id ? data : r))
      setEditingMessage(false)
    } catch (err) {
      setMessageErr(err.response?.data?.detail || err.message)
    } finally {
      setMessageSaving(false)
    }
  }

  const handleBulkDeleteStaff = async () => {
    setBulkDeletingStaff(true)
    try {
      await Promise.all([...staffSelected].map(id => api.delete(`/staff/${id}`)))
      setStaff(prev => prev.filter(s => !staffSelected.has(s.id)))
      setStaffSelectMode(false)
      setStaffSelected(new Set())
    } catch (err) { setStaffError(err.message) }
    finally { setBulkDeletingStaff(false) }
  }

  const handleBulkDeleteVet = async () => {
    setBulkDeletingVet(true)
    try {
      await Promise.all([...vetSelected].map(id => api.delete(`/vet/${id}`)))
      setVets(prev => prev.filter(v => !vetSelected.has(v.id)))
      setVetSelectMode(false)
      setVetSelected(new Set())
    } catch (err) { setVetsError(err.message) }
    finally { setBulkDeletingVet(false) }
  }

  const handleBulkDeleteDonation = async () => {
    setBulkDeletingDonation(true)
    try {
      await Promise.all([...donationSelected].map(id => api.delete(`/donations/${id}`)))
      setDonations(prev => prev.filter(d => !donationSelected.has(d.id)))
      setDonationSelectMode(false)
      setDonationSelected(new Set())
    } catch (err) { setDonationsError(err.message) }
    finally { setBulkDeletingDonation(false) }
  }

  const handleBulkDeleteFoster = async () => {
    setBulkDeletingFoster(true)
    try {
      await Promise.all([...fosterSelected].map(id => api.delete(`/fosters/${id}`)))
      setFosters(prev => prev.filter(f => !fosterSelected.has(f.id)))
      setFosterSelectMode(false)
      setFosterSelected(new Set())
    } catch (err) { setFostersError(err.message) }
    finally { setBulkDeletingFoster(false) }
  }

  return (
    <div className="sd-page">
      <StarField />
      <DashboardBackground />
      <Navbar />

      <div className="sd-layout">

        {/* ── Left Sidebar ── */}
        <aside className="sd-sidebar">
          <div className="sd-sidebar-label">NAVIGATION</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              className={`sd-nav-item ${activeNav === item ? 'active' : ''}`}
              onClick={() => setActiveNav(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </aside>

        {/* ── Main Content ── */}
        <main className="sd-main">

          {/* ── OVERVIEW ── */}
          {activeNav === 'Overview' && (
            <>
              {/* Hero */}
              <div className="sd-hero">
                <div className="sd-watermark" aria-hidden="true">{pad(total)}</div>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">{user?.name} · SHELTER PORTAL</p>
                  <h1 className="sd-hero-headline">
                    <span className="sd-hero-num">{pad(total)}</span> ANIMALS<br />IN YOUR SHELTER
                  </h1>
                </div>
              </div>

              {/* Stats */}
              <div className="stats-grid">
                <div className={`stat-card total ${statusFilter === null ? 'stat-card--active' : ''}`}
                  style={{ cursor: 'pointer' }} onClick={() => setStatusFilter(null)}>
                  <div className="stat-num">{pad(total)}</div>
                  <div className="stat-label">Total Animals</div>
                </div>
                <div className={`stat-card avail ${statusFilter === 'available' ? 'stat-card--active' : ''}`}
                  style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('available')}>
                  <div className="stat-num" style={{ color: '#FFD700' }}>{pad(available)}</div>
                  <div className="stat-label">Available</div>
                </div>
                <div className={`stat-card adopted ${statusFilter === 'adopted' ? 'stat-card--active' : ''}`}
                  style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('adopted')}>
                  <div className="stat-num">{pad(adopted)}</div>
                  <div className="stat-label">Adopted</div>
                </div>
                <div className={`stat-card foster ${statusFilter === 'fostered' ? 'stat-card--active' : ''}`}
                  style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('fostered')}>
                  <div className="stat-num">{pad(fostered)}</div>
                  <div className="stat-label">Fostered</div>
                </div>
              </div>

              {/* Section heading */}
              <div className="sd-section-title">
                {statusFilter ? statusFilter.toUpperCase() : 'ALL ANIMALS'}
                <span className="sd-section-count">{filteredAnimals.length} TOTAL</span>
                <button className="sd-add-btn" onClick={() => setAddOpen(true)}>+ ADD ANIMAL</button>
              </div>

              {loading && <div className="sd-loading">LOADING ANIMALS</div>}
              {error && <div className="alert alert-error">{error}</div>}

              {!loading && filteredAnimals.length === 0 && (
                <div className="ad-empty">
                  <span className="ad-empty-num">00</span>
                  <p>No {statusFilter ?? ''} animals found.</p>
                </div>
              )}

              {/* Animal flashcard grid */}
              {!loading && filteredAnimals.length > 0 && (
                <div className="animals-grid">
                  {filteredAnimals.map((a) => (
                    <div key={a.id} className="animal-card sd-card-clickable" onClick={() => openModal(a)}>
                      <div className="animal-card-img">
                        <img src={a.image_url} alt={a.name} />
                        <span className={`ac-badge ac-badge-${a.status}`}>{a.status}</span>
                      </div>
                      <div className="animal-card-body">
                        <div className="ac-header">
                          <div className="animal-card-name">{a.name}</div>
                          <span className="ac-gender">{a.gender === 'Male' ? 'M' : 'F'}</span>
                        </div>
                        <div className="animal-card-meta">{a.breed}</div>
                        <div className="animal-card-meta">
                          {a.dob ? `Admitted ${a.dob}` : `${a.age} ${a.age === 1 ? 'year' : 'years'} old`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Login Activity */}
              <div className="sd-section-title" style={{ marginTop: '48px' }}>
                RECENT LOGIN ACTIVITY
                <span className="sd-section-count">{loginHistory.length} ENTRIES</span>
              </div>
              {loginHistoryLoading && <div className="sd-loading" style={{ padding: '0 48px' }}>LOADING</div>}
              {!loginHistoryLoading && (
                <div className="lh-table-wrap">
                  {loginHistory.length === 0 ? (
                    <p className="sd-health-none" style={{ padding: '16px 0' }}>No login records yet.</p>
                  ) : (
                    <table className="lh-table">
                      <thead>
                        <tr>
                          <th>TIME</th>
                          <th>USER TYPE</th>
                          <th>EMAIL</th>
                          <th>IP ADDRESS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginHistory.map((row) => (
                          <tr key={row.log_id}>
                            <td>{row.login_time ? new Date(row.login_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td><span className={`lh-badge lh-badge--${row.user_type}`}>{row.user_type.toUpperCase()}</span></td>
                            <td>{row.email}</td>
                            <td className="lh-ip">{row.ip_address || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── HEALTH SCREENING ── */}
          {activeNav === 'Health Screening' && (
            <div className="sd-health">
              <div className="sd-hero" style={{ marginBottom: 0 }}>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">SHELTER PORTAL · MEDICAL</p>
                  <h1 className="sd-hero-headline">HEALTH<br />SCREENING</h1>
                </div>
              </div>

              <div className="sd-health-controls">
                <div className="sd-section-title" style={{ marginTop: '40px' }}>SELECT ANIMAL</div>
                <select
                  className="sd-select"
                  value={selectedPet}
                  onChange={(e) => handleSelectPet(e.target.value)}
                >
                  <option value="">-- Choose a pet --</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.name}>{a.name} ({a.species})</option>
                  ))}
                </select>
              </div>

              {healthLoading && <div className="sd-loading">LOADING HEALTH DATA</div>}
              {healthError && healthError !== 'no-record' && (
                <div className="alert alert-error" style={{ margin: '0 48px' }}>{healthError}</div>
              )}

              {/* No record yet — offer to create one */}
              {!healthLoading && healthError === 'no-record' && !healthEditing && (
                <div className="sd-health-panel">
                  <p className="sd-health-none">No health record found for {selectedPet}.</p>
                  <button className="sd-modal-action-btn sd-modal-edit" style={{ marginTop: '16px' }} onClick={startNewRecord}>
                    + CREATE HEALTH RECORD
                  </button>
                </div>
              )}

              {/* View mode */}
              {healthData && !healthEditing && (
                <div className="sd-health-panel">
                  <div className="sd-health-panel-topbar">
                    <div className="sd-health-title">{healthData.animal_name}</div>
                    <div className="sd-health-panel-actions">
                      {confirmDelHealth ? (
                        <>
                          <span className="sd-delete-confirm-text">DELETE RECORD?</span>
                          <button className="sd-modal-action-btn sd-modal-delete-confirm" onClick={deleteHealthRecord} disabled={healthSaving}>
                            {healthSaving ? '...' : 'YES'}
                          </button>
                          <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setConfirmDelHealth(false)}>NO</button>
                        </>
                      ) : (
                        <>
                          <button className="sd-modal-action-btn sd-modal-edit" onClick={startHealthEdit}>EDIT</button>
                          <button className="sd-modal-action-btn sd-modal-delete" onClick={() => setConfirmDelHealth(true)}>DELETE RECORD</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="sd-health-grid">
                    <div className="sd-health-card">
                      <div className="sd-health-label">WEIGHT</div>
                      <div className="sd-health-value">{healthData.weight ?? '—'} <span className="sd-health-unit">kg</span></div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">TEMPERATURE</div>
                      <div className="sd-health-value">{healthData.temperature ?? '—'} <span className="sd-health-unit">°C</span></div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">LAST CHECKUP</div>
                      <div className="sd-health-value sd-health-value--sm">{healthData.last_checkup || '—'}</div>
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">ATTENDING VET</div>
                      <div className="sd-health-value sd-health-value--sm">{healthData.vet_name || '—'}</div>
                    </div>
                  </div>

                  <div className="sd-section-title" style={{ marginTop: '40px' }}>VACCINATIONS</div>
                  {healthData.vaccinations.length === 0 ? (
                    <p className="sd-health-none">No vaccinations on record.</p>
                  ) : (
                    <div className="sd-vacc-table">
                      <div className="sd-vacc-row sd-vacc-header">
                        <span>VACCINE</span><span>DATE GIVEN</span><span>NEXT DUE</span><span></span>
                      </div>
                      {healthData.vaccinations.map((v, i) => (
                        <div key={i} className="sd-vacc-row">
                          <span className="sd-vacc-name">{v.name}</span>
                          <span>{v.date_given}</span>
                          <span style={{ color: '#FFD700' }}>{v.next_due}</span>
                          <span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Edit / Create mode */}
              {healthEditing && editHealth && (
                <div className="sd-health-panel">
                  <div className="sd-health-panel-topbar">
                    <div className="sd-health-title">{selectedPet}</div>
                    <div className="sd-health-panel-actions">
                      <button className="sd-modal-action-btn sd-modal-save" onClick={saveHealthRecord} disabled={healthSaving}>
                        {healthSaving ? 'SAVING...' : 'SAVE'}
                      </button>
                      <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setHealthEditing(false)} disabled={healthSaving}>
                        CANCEL
                      </button>
                    </div>
                  </div>

                  <div className="sd-health-grid">
                    <div className="sd-health-card">
                      <div className="sd-health-label">WEIGHT (kg)</div>
                      <input className="sd-health-input" type="number" step="0.1" placeholder="e.g. 12.5"
                        value={editHealth.weight}
                        onChange={(e) => setEditHealth(h => ({ ...h, weight: e.target.value }))} />
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">TEMPERATURE (°C)</div>
                      <input className="sd-health-input" type="number" step="0.1" placeholder="e.g. 38.5"
                        value={editHealth.temperature}
                        onChange={(e) => setEditHealth(h => ({ ...h, temperature: e.target.value }))} />
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">LAST CHECKUP</div>
                      <input className="sd-health-input" type="date"
                        value={editHealth.last_checkup}
                        onChange={(e) => setEditHealth(h => ({ ...h, last_checkup: e.target.value }))} />
                    </div>
                    <div className="sd-health-card">
                      <div className="sd-health-label">ATTENDING VET</div>
                      <select
                        className="sd-health-input sd-health-select"
                        value={editHealth.vet_name}
                        onChange={(e) => setEditHealth(h => ({ ...h, vet_name: e.target.value }))}
                      >
                        <option value="">— Select vet —</option>
                        {vets.map(v => (
                          <option key={v.id} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sd-section-title" style={{ marginTop: '40px' }}>
                    VACCINATIONS
                    <button className="sd-add-btn" style={{ fontSize: '0.75rem', padding: '4px 14px' }} onClick={addVaccRow}>
                      + ADD ROW
                    </button>
                  </div>

                  <div className="sd-vacc-table">
                    <div className="sd-vacc-row sd-vacc-header">
                      <span>VACCINE</span><span>DATE GIVEN</span><span>NEXT DUE</span><span></span>
                    </div>
                    {editHealth.vaccinations.length === 0 && (
                      <div className="sd-vacc-row"><span className="sd-health-none" style={{ gridColumn: '1/-1' }}>No vaccinations — click + ADD ROW</span></div>
                    )}
                    {editHealth.vaccinations.map((v, i) => (
                      <div key={i} className="sd-vacc-row sd-vacc-edit-row">
                        <input className="sd-vacc-input" placeholder="Vaccine name"
                          value={v.name} onChange={(e) => updateVacc(i, 'name', e.target.value)} />
                        <input className="sd-vacc-input" type="date"
                          value={v.date_given} onChange={(e) => updateVacc(i, 'date_given', e.target.value)} />
                        <input className="sd-vacc-input" type="date"
                          value={v.next_due} onChange={(e) => updateVacc(i, 'next_due', e.target.value)} />
                        <button className="sd-vacc-del" onClick={() => removeVaccRow(i)}>X</button>
                      </div>
                    ))}
                  </div>

                  {healthSaveErr && <div className="alert alert-error" style={{ marginTop: '16px' }}>{healthSaveErr}</div>}
                </div>
              )}
            </div>
          )}

          {/* ── STAFF ── */}
          {activeNav === 'Staff' && (
            <div className="sd-health">
              <div className="sd-hero" style={{ marginBottom: 0 }}>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">SHELTER PORTAL · TEAM</p>
                  <h1 className="sd-hero-headline">STAFF<br />DIRECTORY</h1>
                </div>
              </div>

              <div className="sd-section-title sd-section-title--staff" style={{ marginTop: '40px' }}>
                TEAM MEMBERS
                <span className="sd-section-count">{staff.length} TOTAL</span>
                <div className="sd-section-btns">
                  {staffSelectMode ? (
                    <>
                      {staffSelected.size > 0 && (
                        <button className="sd-bulk-delete-btn" onClick={handleBulkDeleteStaff} disabled={bulkDeletingStaff}>
                          {bulkDeletingStaff ? 'DELETING...' : `DELETE ${staffSelected.size}`}
                        </button>
                      )}
                      <button className="sd-cancel-select-btn" onClick={() => { setStaffSelectMode(false); setStaffSelected(new Set()) }}>
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="sd-remove-btn" onClick={() => setStaffSelectMode(true)}>REMOVE</button>
                      <button className="sd-add-btn" onClick={() => { setStaffAdding(a => !a); setStaffFormErr('') }}>
                        {staffAdding ? '− CANCEL' : '+ ADD STAFF'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Add staff inline form */}
              {staffAdding && (
                <form className="sd-staff-form" onSubmit={handleAddStaff}>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">NAME *</label>
                      <input className="sd-edit-input" required placeholder="Full name"
                        value={staffForm.name}
                        onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">POSITION *</label>
                      <input className="sd-edit-input" required placeholder="e.g. Vet, Caretaker"
                        value={staffForm.position}
                        onChange={e => setStaffForm(f => ({ ...f, position: e.target.value }))} />
                    </div>
                  </div>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">CONTACT NO</label>
                      <input className="sd-edit-input" placeholder="+1-555-0100"
                        value={staffForm.contact_no}
                        onChange={e => setStaffForm(f => ({ ...f, contact_no: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">EMAIL</label>
                      <input className="sd-edit-input" type="email" placeholder="staff@shelter.com"
                        value={staffForm.email}
                        onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">DEPARTMENT</label>
                      <input className="sd-edit-input" placeholder="e.g. Animal Care, Admin"
                        value={staffForm.department}
                        onChange={e => setStaffForm(f => ({ ...f, department: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">HIRE DATE</label>
                      <input className="sd-edit-input" type="date"
                        value={staffForm.hire_date}
                        onChange={e => setStaffForm(f => ({ ...f, hire_date: e.target.value }))} />
                    </div>
                  </div>
                  {staffFormErr && <div className="alert alert-error">{staffFormErr}</div>}
                  <div className="sd-add-actions">
                    <button type="submit" className="sd-modal-action-btn sd-modal-save" disabled={staffSaving}>
                      {staffSaving ? 'SAVING...' : 'ADD MEMBER'}
                    </button>
                  </div>
                </form>
              )}

              {staffLoading && <div className="sd-loading">LOADING STAFF</div>}
              {staffError && <div className="alert alert-error" style={{ margin: '0 48px' }}>{staffError}</div>}

              {!staffLoading && staff.length === 0 && !staffAdding && (
                <div className="sd-health-panel">
                  <p className="sd-health-none">No staff members added yet. Click + ADD STAFF to get started.</p>
                </div>
              )}

              {staff.length > 0 && (
                <div className="sd-staff-grid">
                  {staff.map(s => (
                    <div key={s.id}
                      className={`sd-staff-card ${editingStaff === s.id ? 'sd-staff-card--editing' : ''} ${staffSelected.has(s.id) ? 'sd-staff-card--selected' : ''}`}
                      onClick={staffSelectMode
                        ? () => setStaffSelected(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })
                        : () => !editingStaff && setDetailCard({ type: 'staff', data: s })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="sd-card-top">
                        {staffSelectMode && (
                          <input type="checkbox" className="sd-card-checkbox" readOnly
                            checked={staffSelected.has(s.id)}
                            onClick={e => e.stopPropagation()} />
                        )}
                        <div className="sd-staff-avatar">{s.name.charAt(0).toUpperCase()}</div>
                        {editingStaff === s.id ? (
                          <div className="sd-staff-edit-body">
                            <input className="sd-staff-edit-input" placeholder="Name"
                              value={staffEditForm.name}
                              onChange={e => setStaffEditForm(f => ({ ...f, name: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Position"
                              value={staffEditForm.position}
                              onChange={e => setStaffEditForm(f => ({ ...f, position: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Contact no"
                              value={staffEditForm.contact_no}
                              onChange={e => setStaffEditForm(f => ({ ...f, contact_no: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Email" type="email"
                              value={staffEditForm.email}
                              onChange={e => setStaffEditForm(f => ({ ...f, email: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Department"
                              value={staffEditForm.department}
                              onChange={e => setStaffEditForm(f => ({ ...f, department: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Hire date" type="date"
                              value={staffEditForm.hire_date}
                              onChange={e => setStaffEditForm(f => ({ ...f, hire_date: e.target.value }))} />
                            {staffEditErr && <div className="sd-staff-edit-err">{staffEditErr}</div>}
                            <div className="sd-staff-edit-actions">
                              <button className="sd-staff-save" onClick={() => saveEditStaff(s.id)}>SAVE</button>
                              <button className="sd-staff-cancel" onClick={() => setEditingStaff(null)}>CANCEL</button>
                            </div>
                          </div>
                        ) : (
                          <div className="sd-staff-info">
                            <div className="sd-staff-name">{s.name}</div>
                            <div className="sd-staff-role">{s.position}</div>
                            {s.qualification && <div className="sd-staff-meta"><span className="sd-meta-label">Edu</span>{s.qualification}</div>}
                            {s.department    && <div className="sd-staff-meta"><span className="sd-meta-label">Dept</span>{s.department}</div>}
                            {s.hire_date     && <div className="sd-staff-meta"><span className="sd-meta-label">Joined</span>{s.hire_date}</div>}
                            {s.contact_no    && <div className="sd-staff-meta"><span className="sd-meta-label">Phone</span>{s.contact_no}</div>}
                            {s.email         && <div className="sd-staff-meta"><span className="sd-meta-label">Email</span>{s.email}</div>}
                          </div>
                        )}
                      </div>
                      {editingStaff !== s.id && !staffSelectMode && (
                        <div className="sd-card-btn-row">
                          <button className="sd-staff-edit-btn" onClick={e => { e.stopPropagation(); startEditStaff(s) }}>EDIT</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── VETS ── */}
          {activeNav === 'Vets' && (
            <div className="sd-health">
              <div className="sd-hero" style={{ marginBottom: 0 }}>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">SHELTER PORTAL · VETERINARY</p>
                  <h1 className="sd-hero-headline">VET<br />DIRECTORY</h1>
                </div>
              </div>

              <div className="sd-section-title sd-section-title--vet" style={{ marginTop: '40px' }}>
                VETERINARIANS
                <span className="sd-section-count">{vets.length} TOTAL</span>
                <div className="sd-section-btns">
                  {vetSelectMode ? (
                    <>
                      {vetSelected.size > 0 && (
                        <button className="sd-bulk-delete-btn" onClick={handleBulkDeleteVet} disabled={bulkDeletingVet}>
                          {bulkDeletingVet ? 'DELETING...' : `DELETE ${vetSelected.size}`}
                        </button>
                      )}
                      <button className="sd-cancel-select-btn" onClick={() => { setVetSelectMode(false); setVetSelected(new Set()) }}>
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="sd-remove-btn" onClick={() => setVetSelectMode(true)}>REMOVE</button>
                      <button className="sd-add-btn" onClick={() => { setVetAdding(a => !a); setVetFormErr('') }}>
                        {vetAdding ? '− CANCEL' : '+ ADD VET'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {vetAdding && (
                <form className="sd-staff-form" onSubmit={handleAddVet}>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">NAME *</label>
                      <input className="sd-edit-input" required placeholder="Dr. Full Name"
                        value={vetForm.name}
                        onChange={e => setVetForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">SPECIALITY</label>
                      <input className="sd-edit-input" placeholder="e.g. Surgery, Dermatology"
                        value={vetForm.speciality}
                        onChange={e => setVetForm(f => ({ ...f, speciality: e.target.value }))} />
                    </div>
                  </div>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">CONTACT NO</label>
                      <input className="sd-edit-input" placeholder="+1-555-0100"
                        value={vetForm.contact_no}
                        onChange={e => setVetForm(f => ({ ...f, contact_no: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">EMAIL</label>
                      <input className="sd-edit-input" type="email" placeholder="vet@clinic.com"
                        value={vetForm.email}
                        onChange={e => setVetForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">LICENSE NO</label>
                      <input className="sd-edit-input" placeholder="e.g. VET-2024-001"
                        value={vetForm.license_no}
                        onChange={e => setVetForm(f => ({ ...f, license_no: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">YEARS EXPERIENCE</label>
                      <input className="sd-edit-input" type="number" min="0" placeholder="e.g. 8"
                        value={vetForm.years_exp}
                        onChange={e => setVetForm(f => ({ ...f, years_exp: e.target.value }))} />
                    </div>
                  </div>
                  <div className="sd-add-row">
                    <div className="sd-add-field" style={{ gridColumn: '1 / -1' }}>
                      <label className="sd-add-label">CLINIC / HOSPITAL</label>
                      <input className="sd-edit-input" placeholder="e.g. City Animal Hospital"
                        value={vetForm.clinic}
                        onChange={e => setVetForm(f => ({ ...f, clinic: e.target.value }))} />
                    </div>
                  </div>
                  {vetFormErr && <div className="alert alert-error">{vetFormErr}</div>}
                  <div className="sd-add-actions">
                    <button type="submit" className="sd-modal-action-btn sd-modal-save" disabled={vetSaving}>
                      {vetSaving ? 'SAVING...' : 'ADD VET'}
                    </button>
                  </div>
                </form>
              )}

              {vetsLoading && <div className="sd-loading">LOADING VETS</div>}
              {vetsError && <div className="alert alert-error" style={{ margin: '0 48px' }}>{vetsError}</div>}

              {!vetsLoading && vets.length === 0 && !vetAdding && (
                <div className="sd-health-panel">
                  <p className="sd-health-none">No vets added yet. Click + ADD VET to get started.</p>
                </div>
              )}

              {vets.length > 0 && (
                <div className="sd-staff-grid">
                  {vets.map(v => (
                    <div key={v.id}
                      className={`sd-staff-card sd-vet-card ${editingVet === v.id ? 'sd-staff-card--editing' : ''} ${vetSelected.has(v.id) ? 'sd-staff-card--selected' : ''}`}
                      onClick={vetSelectMode
                        ? () => setVetSelected(prev => { const n = new Set(prev); n.has(v.id) ? n.delete(v.id) : n.add(v.id); return n })
                        : () => !editingVet && setDetailCard({ type: 'vet', data: v })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="sd-card-top">
                        {vetSelectMode && (
                          <input type="checkbox" className="sd-card-checkbox" readOnly
                            checked={vetSelected.has(v.id)}
                            onClick={e => e.stopPropagation()} />
                        )}
                        <div className="sd-staff-avatar sd-vet-avatar">{v.name.replace(/Dr\.?\s*/i, '').trim().charAt(0).toUpperCase()}</div>
                        {editingVet === v.id ? (
                          <div className="sd-staff-edit-body">
                            <input className="sd-staff-edit-input" placeholder="Dr. Full Name"
                              value={vetEditForm.name}
                              onChange={e => setVetEditForm(f => ({ ...f, name: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Speciality"
                              value={vetEditForm.speciality}
                              onChange={e => setVetEditForm(f => ({ ...f, speciality: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Contact no"
                              value={vetEditForm.contact_no}
                              onChange={e => setVetEditForm(f => ({ ...f, contact_no: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Email" type="email"
                              value={vetEditForm.email}
                              onChange={e => setVetEditForm(f => ({ ...f, email: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="License no"
                              value={vetEditForm.license_no}
                              onChange={e => setVetEditForm(f => ({ ...f, license_no: e.target.value }))} />
                            <input className="sd-staff-edit-input" type="number" placeholder="Years experience"
                              value={vetEditForm.years_exp}
                              onChange={e => setVetEditForm(f => ({ ...f, years_exp: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Clinic / Hospital"
                              value={vetEditForm.clinic}
                              onChange={e => setVetEditForm(f => ({ ...f, clinic: e.target.value }))} />
                            {vetEditErr && <div className="sd-staff-edit-err">{vetEditErr}</div>}
                            <div className="sd-staff-edit-actions">
                              <button className="sd-staff-save" onClick={() => saveEditVet(v.id)}>SAVE</button>
                              <button className="sd-staff-cancel" onClick={() => setEditingVet(null)}>CANCEL</button>
                            </div>
                          </div>
                        ) : (
                          <div className="sd-staff-info">
                            <div className="sd-staff-name">{v.name}</div>
                            <div className="sd-staff-role sd-vet-role">{v.speciality || 'General Practice'}</div>
                            {v.clinic      && <div className="sd-staff-meta"><span className="sd-meta-label">Clinic</span>{v.clinic}</div>}
                            {v.license_no  && <div className="sd-staff-meta"><span className="sd-meta-label">License</span>{v.license_no}</div>}
                            {v.years_exp != null && <div className="sd-staff-meta"><span className="sd-meta-label">Exp</span>{v.years_exp} yrs</div>}
                            {v.contact_no  && <div className="sd-staff-meta"><span className="sd-meta-label">Phone</span>{v.contact_no}</div>}
                            {v.email       && <div className="sd-staff-meta"><span className="sd-meta-label">Email</span>{v.email}</div>}
                          </div>
                        )}
                      </div>
                      {editingVet !== v.id && !vetSelectMode && (
                        <div className="sd-card-btn-row">
                          <button className="sd-staff-edit-btn" onClick={e => { e.stopPropagation(); startEditVet(v) }}>EDIT</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DONATIONS ── */}
          {activeNav === 'Donations' && (
            <div className="sd-health">
              <div className="sd-hero" style={{ marginBottom: 0 }}>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">SHELTER PORTAL · FUNDING</p>
                  <h1 className="sd-hero-headline">DONATIONS</h1>
                </div>
              </div>

              <div className="sd-section-title sd-section-title--donor" style={{ marginTop: '40px' }}>
                DONOR RECORDS
                <span className="sd-section-count">{donations.length} TOTAL</span>
                <div className="sd-section-btns">
                  {donationSelectMode ? (
                    <>
                      {donationSelected.size > 0 && (
                        <button className="sd-bulk-delete-btn" onClick={handleBulkDeleteDonation} disabled={bulkDeletingDonation}>
                          {bulkDeletingDonation ? 'DELETING...' : `DELETE ${donationSelected.size}`}
                        </button>
                      )}
                      <button className="sd-cancel-select-btn" onClick={() => { setDonationSelectMode(false); setDonationSelected(new Set()) }}>
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="sd-remove-btn" onClick={() => setDonationSelectMode(true)}>REMOVE</button>
                      <button className="sd-add-btn" onClick={() => { setDonationAdding(a => !a); setDonationFormErr('') }}>
                        {donationAdding ? '− CANCEL' : '+ ADD DONATION'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {donationAdding && (
                <form className="sd-staff-form" onSubmit={handleAddDonation}>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">DONOR NAME *</label>
                      <input className="sd-edit-input" required placeholder="Organisation or person"
                        value={donationForm.name}
                        onChange={e => setDonationForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">AMOUNT (₹)</label>
                      <input className="sd-edit-input" type="number" min="0" step="0.01" placeholder="0.00"
                        value={donationForm.amount}
                        onChange={e => setDonationForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                  </div>
                  {donationFormErr && <div className="alert alert-error">{donationFormErr}</div>}
                  <div className="sd-add-actions">
                    <button type="submit" className="sd-modal-action-btn sd-modal-save" disabled={donationSaving}>
                      {donationSaving ? 'SAVING...' : 'ADD DONATION'}
                    </button>
                  </div>
                </form>
              )}

              {donationsLoading && <div className="sd-loading">LOADING DONATIONS</div>}
              {donationsError && <div className="alert alert-error" style={{ margin: '0 48px' }}>{donationsError}</div>}

              {!donationsLoading && donations.length === 0 && !donationAdding && (
                <div className="sd-health-panel">
                  <p className="sd-health-none">No donations recorded yet. Click + ADD DONATION to get started.</p>
                </div>
              )}

              {donations.length > 0 && (
                <div className="sd-staff-grid">
                  {donations.map(d => (
                    <div key={d.id}
                      className={`sd-staff-card sd-donor-card ${editingDonation === d.id ? 'sd-staff-card--editing' : ''} ${donationSelected.has(d.id) ? 'sd-staff-card--selected' : ''}`}
                      onClick={donationSelectMode ? () => setDonationSelected(prev => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n }) : undefined}
                      style={donationSelectMode ? { cursor: 'pointer' } : undefined}
                    >
                      <div className="sd-card-top">
                        {donationSelectMode && (
                          <input type="checkbox" className="sd-card-checkbox" readOnly
                            checked={donationSelected.has(d.id)}
                            onClick={e => e.stopPropagation()} />
                        )}
                        <div className="sd-staff-avatar sd-donor-avatar">{d.name.charAt(0).toUpperCase()}</div>
                        {editingDonation === d.id ? (
                          <div className="sd-staff-edit-body">
                            <input className="sd-staff-edit-input" placeholder="Donor name"
                              value={donationEditForm.name}
                              onChange={e => setDonationEditForm(f => ({ ...f, name: e.target.value }))} />
                            <input className="sd-staff-edit-input" type="number" min="0" step="0.01" placeholder="Amount (₹)"
                              value={donationEditForm.amount}
                              onChange={e => setDonationEditForm(f => ({ ...f, amount: e.target.value }))} />
                            {donationEditErr && <div className="sd-staff-edit-err">{donationEditErr}</div>}
                            <div className="sd-staff-edit-actions">
                              <button className="sd-staff-save" onClick={() => saveEditDonation(d.id)}>SAVE</button>
                              <button className="sd-staff-cancel" onClick={() => setEditingDonation(null)}>CANCEL</button>
                            </div>
                          </div>
                        ) : (
                          <div className="sd-staff-info">
                            <div className="sd-staff-name">{d.name}</div>
                            <div className="sd-donor-amount">₹{Number(d.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                          </div>
                        )}
                      </div>
                      {editingDonation !== d.id && !donationSelectMode && (
                        <div className="sd-card-btn-row">
                          <button className="sd-staff-edit-btn" onClick={() => startEditDonation(d)}>EDIT</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FOSTERS ── */}
          {activeNav === 'Fosters' && (
            <div className="sd-health">
              <div className="sd-hero" style={{ marginBottom: 0 }}>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">SHELTER PORTAL · FOSTER NETWORK</p>
                  <h1 className="sd-hero-headline">TRUSTED<br />FOSTERS</h1>
                </div>
              </div>

              <div className="sd-section-title sd-section-title--foster" style={{ marginTop: '40px' }}>
                FOSTER CARERS
                <span className="sd-section-count">{fosters.length} TOTAL</span>
                <div className="sd-section-btns">
                  {fosterSelectMode ? (
                    <>
                      {fosterSelected.size > 0 && (
                        <button className="sd-bulk-delete-btn" onClick={handleBulkDeleteFoster} disabled={bulkDeletingFoster}>
                          {bulkDeletingFoster ? 'DELETING...' : `DELETE ${fosterSelected.size}`}
                        </button>
                      )}
                      <button className="sd-cancel-select-btn" onClick={() => { setFosterSelectMode(false); setFosterSelected(new Set()) }}>
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="sd-remove-btn" onClick={() => setFosterSelectMode(true)}>REMOVE</button>
                      <button className="sd-add-btn" onClick={() => { setFosterAdding(a => !a); setFosterFormErr('') }}>
                        {fosterAdding ? '− CANCEL' : '+ ADD FOSTER'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {fosterAdding && (
                <form className="sd-staff-form" onSubmit={handleAddFoster}>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">NAME *</label>
                      <input className="sd-edit-input" required placeholder="Full name"
                        value={fosterForm.name}
                        onChange={e => setFosterForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">CONTACT NUMBER</label>
                      <input className="sd-edit-input" placeholder="+91-99999-00000"
                        value={fosterForm.number}
                        onChange={e => setFosterForm(f => ({ ...f, number: e.target.value }))} />
                    </div>
                  </div>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">FOSTER DURATION (days)</label>
                      <input className="sd-edit-input" type="number" min="0" placeholder="e.g. 30"
                        value={fosterForm.duration}
                        onChange={e => setFosterForm(f => ({ ...f, duration: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">EMAIL</label>
                      <input className="sd-edit-input" type="email" placeholder="foster@email.com"
                        value={fosterForm.email}
                        onChange={e => setFosterForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="sd-add-row">
                    <div className="sd-add-field">
                      <label className="sd-add-label">ANIMALS FOSTERED</label>
                      <input className="sd-edit-input" type="number" min="0" placeholder="e.g. 3"
                        value={fosterForm.animals_fostered}
                        onChange={e => setFosterForm(f => ({ ...f, animals_fostered: e.target.value }))} />
                    </div>
                    <div className="sd-add-field">
                      <label className="sd-add-label">ADDRESS</label>
                      <input className="sd-edit-input" placeholder="Home address"
                        value={fosterForm.address}
                        onChange={e => setFosterForm(f => ({ ...f, address: e.target.value }))} />
                    </div>
                  </div>
                  {fosterFormErr && <div className="alert alert-error">{fosterFormErr}</div>}
                  <div className="sd-add-actions">
                    <button type="submit" className="sd-modal-action-btn sd-modal-save" disabled={fosterSaving}>
                      {fosterSaving ? 'SAVING...' : 'ADD FOSTER'}
                    </button>
                  </div>
                </form>
              )}

              {fostersLoading && <div className="sd-loading">LOADING FOSTERS</div>}
              {fostersError && <div className="alert alert-error" style={{ margin: '0 48px' }}>{fostersError}</div>}

              {!fostersLoading && fosters.length === 0 && !fosterAdding && (
                <div className="sd-health-panel">
                  <p className="sd-health-none">No foster carers added yet. Click + ADD FOSTER to get started.</p>
                </div>
              )}

              {fosters.length > 0 && (
                <div className="sd-staff-grid">
                  {fosters.map(f => (
                    <div key={f.id}
                      className={`sd-staff-card sd-foster-card ${editingFoster === f.id ? 'sd-staff-card--editing' : ''} ${fosterSelected.has(f.id) ? 'sd-staff-card--selected' : ''}`}
                      onClick={fosterSelectMode
                        ? () => setFosterSelected(prev => { const n = new Set(prev); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n })
                        : () => !editingFoster && setDetailCard({ type: 'foster', data: f })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="sd-card-top">
                        {fosterSelectMode && (
                          <input type="checkbox" className="sd-card-checkbox" readOnly
                            checked={fosterSelected.has(f.id)}
                            onClick={e => e.stopPropagation()} />
                        )}
                        <div className="sd-staff-avatar sd-foster-avatar">{f.name.charAt(0).toUpperCase()}</div>
                        {editingFoster === f.id ? (
                          <div className="sd-staff-edit-body">
                            <input className="sd-staff-edit-input" placeholder="Full name"
                              value={fosterEditForm.name}
                              onChange={e => setFosterEditForm(g => ({ ...g, name: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Contact number"
                              value={fosterEditForm.number}
                              onChange={e => setFosterEditForm(g => ({ ...g, number: e.target.value }))} />
                            <input className="sd-staff-edit-input" type="number" placeholder="Duration (days)"
                              value={fosterEditForm.duration}
                              onChange={e => setFosterEditForm(g => ({ ...g, duration: e.target.value }))} />
                            <input className="sd-staff-edit-input" type="email" placeholder="Email"
                              value={fosterEditForm.email}
                              onChange={e => setFosterEditForm(g => ({ ...g, email: e.target.value }))} />
                            <input className="sd-staff-edit-input" type="number" min="0" placeholder="Animals fostered"
                              value={fosterEditForm.animals_fostered}
                              onChange={e => setFosterEditForm(g => ({ ...g, animals_fostered: e.target.value }))} />
                            <input className="sd-staff-edit-input" placeholder="Address"
                              value={fosterEditForm.address}
                              onChange={e => setFosterEditForm(g => ({ ...g, address: e.target.value }))} />
                            {fosterEditErr && <div className="sd-staff-edit-err">{fosterEditErr}</div>}
                            <div className="sd-staff-edit-actions">
                              <button className="sd-staff-save" onClick={() => saveEditFoster(f.id)}>SAVE</button>
                              <button className="sd-staff-cancel" onClick={() => setEditingFoster(null)}>CANCEL</button>
                            </div>
                          </div>
                        ) : (
                          <div className="sd-staff-info">
                            <div className="sd-staff-name">{f.name}</div>
                            <div className="sd-staff-role sd-foster-role">{f.duration ? `${f.duration}-day foster` : 'Foster carer'}</div>
                            {f.animals_fostered > 0 && <div className="sd-staff-meta"><span className="sd-meta-label">Fostered</span>{f.animals_fostered} animals</div>}
                            {f.address && <div className="sd-staff-meta"><span className="sd-meta-label">Address</span>{f.address}</div>}
                            {f.number  && <div className="sd-staff-meta"><span className="sd-meta-label">Phone</span>{f.number}</div>}
                            {f.email   && <div className="sd-staff-meta"><span className="sd-meta-label">Email</span>{f.email}</div>}
                          </div>
                        )}
                      </div>
                      {editingFoster !== f.id && !fosterSelectMode && (
                        <div className="sd-card-btn-row">
                          <button className="sd-staff-edit-btn" onClick={e => { e.stopPropagation(); startEditFoster(f) }}>EDIT</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ADOPTION REQUESTS — list ── */}
          {activeNav === 'Adoption Requests' && !reviewRequest && (
            <div className="sd-health">
              <div className="sd-hero" style={{ marginBottom: 0 }}>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">SHELTER PORTAL · ADOPTIONS</p>
                  <h1 className="sd-hero-headline">ADOPTION<br />REQUESTS</h1>
                </div>
              </div>

              <div className="sd-section-title" style={{ marginTop: '40px' }}>
                INCOMING REQUESTS
                <span className="sd-section-count">{requests.length} TOTAL</span>
              </div>

              {requestsLoading && <div className="sd-loading">LOADING REQUESTS</div>}
              {requestsError && <div className="alert alert-error" style={{ margin: '0 48px' }}>{requestsError}</div>}

              {!requestsLoading && requests.length === 0 && !requestsError && (
                <div className="sd-health-panel">
                  <p className="sd-health-none">No adoption requests yet.</p>
                </div>
              )}

              {requests.length > 0 && (
                <div className="sd-adoption-list">
                  {requests.map(req => (
                    <div key={req.id} className={`sd-adoption-card sd-adoption-card--${req.status}`}>
                      <div className="sd-adoption-card-header">
                        <div className="sd-adoption-animal">{req.animal_name}</div>
                        <span className={`sd-adoption-badge sd-adoption-badge--${req.status}`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="sd-adoption-meta">
                        <span className="sd-meta-label">ADOPTER</span> {req.adopter_name}
                      </div>
                      <div className="sd-adoption-meta" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {req.created_at ? new Date(req.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                      </div>
                      <div className="sd-adoption-actions">
                        <button
                          className="sd-modal-action-btn sd-modal-bgcheck"
                          onClick={() => openReview(req)}
                        >
                          VIEW FULL REPORT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ADOPTION REQUESTS — adopter review ── */}
          {activeNav === 'Adoption Requests' && reviewRequest && (
            <div className="sd-health">
              {/* back + header */}
              <div className="sd-review-topbar">
                <button className="sd-review-back" onClick={closeReview}>← BACK TO REQUESTS</button>
              </div>

              <div className="sd-hero" style={{ marginBottom: 0 }}>
                <div className="sd-hero-inner">
                  <p className="sd-hero-tag">SHELTER PORTAL · ADOPTIONS · REVIEW</p>
                  <h1 className="sd-hero-headline">{reviewRequest.animal_name}</h1>
                  <span className={`sd-adoption-badge sd-adoption-badge--${reviewRequest.status}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                    {reviewRequest.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {reviewLoading && <div className="sd-loading" style={{ marginTop: '40px' }}>LOADING REPORT</div>}

              {!reviewLoading && reviewAdopter && !reviewAdopter.error && (
                <div className="sd-review-body">

                  {/* Adopter profile */}
                  <div className="sd-review-card">
                    <div className="sd-review-card-title">
                      ADOPTER PROFILE
                      {!editingProfile && (
                        <button className="sd-review-edit-btn" onClick={() => {
                          setProfileForm({
                            name:       reviewAdopter.adopter.name       || '',
                            email:      reviewAdopter.adopter.email      || '',
                            contact_no: reviewAdopter.adopter.contact_no || '',
                            address:    reviewAdopter.adopter.address    || '',
                          })
                          setProfileErr('')
                          setEditingProfile(true)
                        }}>EDIT</button>
                      )}
                    </div>
                    {editingProfile ? (
                      <div className="sd-review-edit-form">
                        {[['NAME','name','text'],['EMAIL','email','email'],['PHONE','contact_no','tel'],['ADDRESS','address','text']].map(([label, field, type]) => (
                          <div className="sd-review-edit-row" key={field}>
                            <span className="sd-meta-label">{label}</span>
                            <input
                              className="sd-staff-edit-input"
                              type={type}
                              value={profileForm[field]}
                              onChange={e => setProfileForm(p => ({ ...p, [field]: e.target.value }))}
                            />
                          </div>
                        ))}
                        {profileErr && <div className="sd-staff-edit-err">{profileErr}</div>}
                        <div className="sd-staff-edit-actions">
                          <button className="sd-staff-save" onClick={saveProfile} disabled={profileSaving}>
                            {profileSaving ? 'SAVING...' : 'SAVE'}
                          </button>
                          <button className="sd-staff-cancel" onClick={() => setEditingProfile(false)} disabled={profileSaving}>CANCEL</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="sd-review-field"><span className="sd-meta-label">NAME</span>{reviewAdopter.adopter.name}</div>
                        <div className="sd-review-field"><span className="sd-meta-label">EMAIL</span>{reviewAdopter.adopter.email}</div>
                        <div className="sd-review-field"><span className="sd-meta-label">PHONE</span>{reviewAdopter.adopter.contact_no || '—'}</div>
                        <div className="sd-review-field"><span className="sd-meta-label">ADDRESS</span>{reviewAdopter.adopter.address || '—'}</div>
                      </>
                    )}
                  </div>

                  {/* Message */}
                  <div className="sd-review-card">
                    <div className="sd-review-card-title">
                      APPLICATION MESSAGE
                      {!editingMessage && (
                        <button className="sd-review-edit-btn" onClick={() => {
                          setMessageForm(reviewRequest.message || '')
                          setMessageErr('')
                          setEditingMessage(true)
                        }}>EDIT</button>
                      )}
                    </div>
                    {editingMessage ? (
                      <div className="sd-review-edit-form">
                        <textarea
                          className="sd-staff-edit-input sd-review-textarea"
                          value={messageForm}
                          onChange={e => setMessageForm(e.target.value)}
                          rows={4}
                        />
                        {messageErr && <div className="sd-staff-edit-err">{messageErr}</div>}
                        <div className="sd-staff-edit-actions">
                          <button className="sd-staff-save" onClick={saveMessage} disabled={messageSaving}>
                            {messageSaving ? 'SAVING...' : 'SAVE'}
                          </button>
                          <button className="sd-staff-cancel" onClick={() => setEditingMessage(false)} disabled={messageSaving}>CANCEL</button>
                        </div>
                      </div>
                    ) : (
                      <p className="sd-review-message">{reviewRequest.message || <span style={{ color: 'var(--text-ghost)' }}>No message provided.</span>}</p>
                    )}
                  </div>

                  {/* Background check */}
                  {reviewBgCheck && (
                    <div className={`sd-review-card sd-review-bgcheck sd-review-bgcheck--${reviewBgCheck.verdict.toLowerCase()}`}>
                      <div className="sd-review-card-title">BACKGROUND CHECK</div>
                      <div className="sd-bgcheck-header" style={{ marginBottom: '10px' }}>
                        <span className={`sd-bgcheck-verdict sd-bgcheck-verdict--${reviewBgCheck.verdict.toLowerCase()}`}>
                          {reviewBgCheck.verdict}
                        </span>
                        <span className="sd-bgcheck-conf">{reviewBgCheck.confidence} CONFIDENCE</span>
                      </div>
                      <p className="sd-bgcheck-summary">{reviewBgCheck.summary}</p>
                      {reviewBgCheck.flags.length > 0 && (
                        <ul className="sd-bgcheck-flags">
                          {reviewBgCheck.flags.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Adoption history */}
                  <div className="sd-review-card">
                    <div className="sd-review-card-title">
                      ADOPTION HISTORY
                      <span className="sd-section-count" style={{ marginLeft: '12px' }}>{reviewAdopter.history.length} REQUESTS</span>
                    </div>
                    {reviewAdopter.history.length === 0 ? (
                      <p className="sd-review-empty">No prior adoption requests.</p>
                    ) : (
                      <div className="lh-table-wrap" style={{ margin: 0, marginTop: '12px' }}>
                        <table className="lh-table">
                          <thead>
                            <tr>
                              <th>ANIMAL</th>
                              <th>STATUS</th>
                              <th>DATE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviewAdopter.history.map((h, i) => (
                              <tr key={i}>
                                <td>{h.animal_name}</td>
                                <td>
                                  <span className={`sd-adoption-badge sd-adoption-badge--${h.status}`}>
                                    {h.status?.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                                  {h.created_at ? h.created_at.slice(0, 10) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Approve / Reject */}
                  {reviewRequest.status === 'pending' && (
                    <div className="sd-review-actions">
                      <button
                        className="sd-modal-action-btn sd-modal-save"
                        onClick={() => handleAdoptionAction(reviewRequest.id, 'approved')}
                        disabled={processingRequest === reviewRequest.id}
                      >
                        {processingRequest === reviewRequest.id ? '...' : 'APPROVE'}
                      </button>
                      <button
                        className="sd-modal-action-btn sd-modal-delete"
                        onClick={() => handleAdoptionAction(reviewRequest.id, 'rejected')}
                        disabled={processingRequest === reviewRequest.id}
                      >
                        {processingRequest === reviewRequest.id ? '...' : 'REJECT'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!reviewLoading && reviewAdopter?.error && (
                <div className="alert alert-error" style={{ margin: '32px 48px' }}>{reviewAdopter.error}</div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── Animal Detail Modal ── */}
      {modalAnimal && (
        <div className="sd-modal-overlay" onClick={closeModal}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-topbar">
              {confirmDelete ? (
                <>
                  <span className="sd-delete-confirm-text">ARE YOU SURE?</span>
                  <button className="sd-modal-action-btn sd-modal-delete-confirm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'REMOVING...' : 'YES, REMOVE'}
                  </button>
                  <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    CANCEL
                  </button>
                </>
              ) : editing ? (
                <>
                  <button className="sd-modal-action-btn sd-modal-save" onClick={saveEdit} disabled={saving}>
                    {saving ? 'SAVING...' : 'SAVE'}
                  </button>
                  <button className="sd-modal-action-btn sd-modal-cancel" onClick={() => setEditing(false)} disabled={saving}>
                    CANCEL
                  </button>
                </>
              ) : (
                <>
                  <button className="sd-modal-action-btn sd-modal-edit" onClick={startEdit}>EDIT</button>
                  <button className="sd-modal-action-btn sd-modal-delete" onClick={() => setConfirmDelete(true)}>DELETE</button>
                </>
              )}
              <button className="sd-modal-close" onClick={closeModal}>CLOSE</button>
            </div>

            <div className="sd-modal-photo">
              <img
                src={editPhotoPreview || modalAnimal.image_url}
                alt={modalAnimal.name}
              />
              <span className={`ac-badge ac-badge-${modalAnimal.status} sd-modal-badge`}>
                {modalAnimal.status}
              </span>
              {editing && (
                <>
                  <button
                    className="sd-modal-photo-change"
                    onClick={() => editPhotoRef.current?.click()}
                    type="button"
                  >
                    CHANGE PHOTO
                  </button>
                  <input
                    ref={editPhotoRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (!file) return
                      setEditPhotoFile(file)
                      setEditPhotoPreview(URL.createObjectURL(file))
                    }}
                  />
                </>
              )}
            </div>

            <div className="sd-modal-body">
              <div className="sd-modal-header">
                <h2 className="sd-modal-name">{modalAnimal.name}</h2>
                <span className="sd-modal-gender">{modalAnimal.gender === 'Male' ? 'M' : 'F'}</span>
              </div>

              <div className="sd-modal-meta-row">
                <div className="sd-modal-meta-item">
                  <span className="sd-modal-meta-label">SPECIES</span>
                  <span className="sd-modal-meta-val">{modalAnimal.species}</span>
                </div>
                <div className="sd-modal-meta-item">
                  <span className="sd-modal-meta-label">BREED</span>
                  <span className="sd-modal-meta-val">{modalAnimal.breed}</span>
                </div>
                <div className="sd-modal-meta-item">
                  <span className="sd-modal-meta-label">AGE</span>
                  <span className="sd-modal-meta-val">{modalAnimal.age} {modalAnimal.age === 1 ? 'yr' : 'yrs'}</span>
                </div>
                <div className="sd-modal-meta-item">
                  <span className="sd-modal-meta-label">GENDER</span>
                  <span className="sd-modal-meta-val">{modalAnimal.gender}</span>
                </div>
                {modalAnimal.dob && (
                  <div className="sd-modal-meta-item">
                    <span className="sd-modal-meta-label">DATE ADMITTED</span>
                    <span className="sd-modal-meta-val">{modalAnimal.dob}</span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="sd-modal-section">
                <div className="sd-modal-section-label">STATUS</div>
                {editing ? (
                  <select
                    className="sd-select"
                    style={{ marginBottom: 0, maxWidth: '240px' }}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="available">Available</option>
                    <option value="adopted">Adopted</option>
                    <option value="fostered">Fostered</option>
                  </select>
                ) : (
                  <span className={`ac-badge ac-badge-${modalAnimal.status}`} style={{ position: 'static', display: 'inline-block' }}>
                    {modalAnimal.status}
                  </span>
                )}
              </div>

              {/* Personality */}
              <div className="sd-modal-section">
                <div className="sd-modal-section-label">PERSONALITY</div>
                {editing ? (
                  <input
                    className="sd-edit-input"
                    value={editTraits}
                    onChange={(e) => setEditTraits(e.target.value)}
                    placeholder="Playful, Calm, Energetic (comma-separated)"
                  />
                ) : (
                  modalAnimal.traits && modalAnimal.traits.length > 0 ? (
                    <div className="sd-modal-traits">
                      {modalAnimal.traits.map((t) => (
                        <span key={t} className="sd-modal-trait">{t}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="sd-modal-empty-field">No traits added yet.</p>
                  )
                )}
              </div>

              {/* Story */}
              <div className="sd-modal-section">
                <div className="sd-modal-section-label">THEIR STORY</div>
                {editing ? (
                  <textarea
                    className="sd-edit-textarea"
                    value={editStory}
                    onChange={(e) => setEditStory(e.target.value)}
                    placeholder="Write this animal's story..."
                    rows={6}
                  />
                ) : (
                  modalAnimal.story ? (
                    <p className="sd-modal-story">{modalAnimal.story}</p>
                  ) : (
                    <p className="sd-modal-empty-field">No story added yet.</p>
                  )
                )}
              </div>

              {saveError && <div className="alert alert-error" style={{ marginTop: '16px' }}>{saveError}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Animal Modal ── */}
      {addOpen && (
        <div className="sd-modal-overlay" onClick={closeAdd}>
          <div className="sd-modal sd-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-topbar">
              <span className="sd-add-modal-title">ADD ANIMAL</span>
              <button className="sd-modal-close" onClick={closeAdd}>CLOSE</button>
            </div>

            <form className="sd-add-form" onSubmit={handleAddSubmit}>

              {/* Photo upload */}
              <div className="sd-add-field">
                <label className="sd-add-label">PHOTO</label>
                <div className="sd-photo-upload" onClick={() => fileInputRef.current?.click()}>
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" className="sd-photo-preview" />
                    : <span className="sd-photo-placeholder">CLICK TO UPLOAD IMAGE</span>
                  }
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
                {!photoFile && (
                  <input
                    className="sd-edit-input"
                    style={{ marginTop: '8px' }}
                    placeholder="Or paste an image URL"
                    value={form.image_url}
                    onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))}
                  />
                )}
              </div>

              <div className="sd-add-row">
                <div className="sd-add-field">
                  <label className="sd-add-label">NAME *</label>
                  <input className="sd-edit-input" required value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="sd-add-field">
                  <label className="sd-add-label">SPECIES</label>
                  <select className="sd-select" style={{ marginBottom: 0 }} value={form.species}
                    onChange={(e) => setForm(f => ({ ...f, species: e.target.value }))}>
                    {['Dog', 'Cat', 'Rabbit', 'Hamster', 'Bird', 'Other'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sd-add-row">
                <div className="sd-add-field">
                  <label className="sd-add-label">BREED *</label>
                  <input className="sd-edit-input" required value={form.breed}
                    onChange={(e) => setForm(f => ({ ...f, breed: e.target.value }))} />
                </div>
                <div className="sd-add-field">
                  <label className="sd-add-label">AGE (years) *</label>
                  <input className="sd-edit-input" required type="number" min="0" value={form.age}
                    onChange={(e) => setForm(f => ({ ...f, age: e.target.value }))} />
                </div>
              </div>

              <div className="sd-add-row">
                <div className="sd-add-field">
                  <label className="sd-add-label">GENDER</label>
                  <select className="sd-select" style={{ marginBottom: 0 }} value={form.gender}
                    onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="sd-add-field">
                  <label className="sd-add-label">STATUS</label>
                  <select className="sd-select" style={{ marginBottom: 0 }} value={form.status}
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="available">Available</option>
                    <option value="adopted">Adopted</option>
                    <option value="fostered">Fostered</option>
                  </select>
                </div>
              </div>

              <div className="sd-add-field">
                <label className="sd-add-label">DATE ADMITTED</label>
                <input className="sd-edit-input" type="date" value={form.dob}
                  onChange={(e) => setForm(f => ({ ...f, dob: e.target.value }))} />
              </div>

              <div className="sd-add-field">
                <label className="sd-add-label">PERSONALITY TRAITS (comma-separated)</label>
                <input className="sd-edit-input" placeholder="Playful, Calm, Energetic" value={form.traits}
                  onChange={(e) => setForm(f => ({ ...f, traits: e.target.value }))} />
              </div>

              <div className="sd-add-field">
                <label className="sd-add-label">THEIR STORY</label>
                <textarea className="sd-edit-textarea" rows={5} placeholder="Write this animal's story..."
                  value={form.story}
                  onChange={(e) => setForm(f => ({ ...f, story: e.target.value }))} />
              </div>

              {addError && <div className="alert alert-error">{addError}</div>}

              <div className="sd-add-actions">
                <button type="submit" className="sd-modal-action-btn sd-modal-save" disabled={addSaving}>
                  {addSaving ? 'SAVING...' : 'ADD ANIMAL'}
                </button>
                <button type="button" className="sd-modal-action-btn sd-modal-cancel" onClick={closeAdd}>
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Staff / Vet / Foster Detail Modal ── */}
      {detailCard && (() => {
        const { type, data } = detailCard
        const isStaff  = type === 'staff'
        const isVet    = type === 'vet'
        const isFoster = type === 'foster'
        const accentColor = isStaff ? 'var(--primary)' : isVet ? '#4A90D9' : '#52B788'
        const initial = (isVet ? data.name.replace(/Dr\.?\s*/i, '') : data.name).trim().charAt(0).toUpperCase()
        const phone = isStaff ? data.contact_no : isVet ? data.contact_no : data.number
        const typeLabel = isStaff ? 'STAFF MEMBER' : isVet ? 'VETERINARIAN' : 'FOSTER CARER'
        const roleLabel = isStaff ? data.position : isVet ? (data.speciality || 'General Practice') : (data.duration ? `${data.duration}-day foster` : 'Foster carer')
        return (
          <div className="sd-modal-overlay" onClick={() => setDetailCard(null)}>
            <div className="sd-person-modal" onClick={e => e.stopPropagation()}>

              {/* Colored top banner */}
              <div className="sd-person-banner" style={{ background: `linear-gradient(135deg, ${accentColor}33 0%, ${accentColor}11 100%)`, borderBottom: `2px solid ${accentColor}55` }}>
                <button className="sd-person-close" onClick={() => setDetailCard(null)}>✕</button>
                <div className="sd-person-banner-inner">
                  <div className="sd-person-big-avatar" style={{ background: accentColor, boxShadow: `0 0 32px ${accentColor}66` }}>{initial}</div>
                  <div className="sd-person-banner-text">
                    <div className="sd-person-badge" style={{ background: `${accentColor}33`, color: accentColor, border: `1px solid ${accentColor}66` }}>{typeLabel}</div>
                    <h2 className="sd-person-name">{data.name}</h2>
                    <div className="sd-person-role" style={{ color: accentColor }}>{roleLabel}</div>
                  </div>
                </div>
              </div>

              {/* Info rows */}
              <div className="sd-person-info">
                {isStaff && <>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">QUALIFICATION</span>
                    <span className="sd-person-info-val">{data.qualification || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">DEPARTMENT</span>
                    <span className="sd-person-info-val">{data.department || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">HIRE DATE</span>
                    <span className="sd-person-info-val">{data.hire_date || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">PHONE</span>
                    <span className="sd-person-info-val">{phone || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">EMAIL</span>
                    <span className="sd-person-info-val">{data.email || '—'}</span>
                  </div>
                </>}
                {isVet && <>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">DEGREE</span>
                    <span className="sd-person-info-val">{data.degree || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">CLINIC</span>
                    <span className="sd-person-info-val">{data.clinic || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">LICENSE NO</span>
                    <span className="sd-person-info-val">{data.license_no || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">EXPERIENCE</span>
                    <span className="sd-person-info-val">{data.years_exp != null ? `${data.years_exp} years` : '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">AVAILABILITY</span>
                    <span className="sd-person-info-val">{data.availability || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">PHONE</span>
                    <span className="sd-person-info-val">{phone || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">EMAIL</span>
                    <span className="sd-person-info-val">{data.email || '—'}</span>
                  </div>
                </>}
                {isFoster && <>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">HOME TYPE</span>
                    <span className="sd-person-info-val">{data.home_type || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">ADDRESS</span>
                    <span className="sd-person-info-val">{data.address || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">DURATION</span>
                    <span className="sd-person-info-val">{data.duration ? `${data.duration} days` : '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">ANIMALS FOSTERED</span>
                    <span className="sd-person-info-val">{data.animals_fostered || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">PHONE</span>
                    <span className="sd-person-info-val">{phone || '—'}</span>
                  </div>
                  <div className="sd-person-info-row" style={{ borderLeftColor: accentColor }}>
                    <span className="sd-person-info-label">EMAIL</span>
                    <span className="sd-person-info-val">{data.email || '—'}</span>
                  </div>
                </>}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
