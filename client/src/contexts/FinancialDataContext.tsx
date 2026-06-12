import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { supabase, FinancialData, Company } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface FinancialDataContextType {
  companies: Company[]
  selectedCompany: Company | null
  setSelectedCompany: (company: Company | null) => void
  createCompany: (name: string) => Promise<Company | null>
  deleteCompany: (companyId: string) => Promise<void>
  loading: boolean
  setLoading: (loading: boolean) => void
  loadFinancialData: (companyId: string, dataType: string, year?: number, month?: number) => Promise<any>
  saveFinancialData: (companyId: string, dataType: string, data: any, year: number, month?: number) => Promise<any>
  deleteFinancialData: (companyId: string, year: number, dataType?: string | string[], month?: number) => Promise<void>
  getCEDettaglioMensileData: (companyId: string, year?: number, month?: number) => Promise<FinancialData[] | null>
  getSourceData: (companyId: string, year?: number, month?: number) => Promise<FinancialData[] | null>
  loadCompanies: () => Promise<void>
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined)

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, isEditorStaff } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const hasInitialized = useRef(false)

  // Funzione per salvare l'azienda selezionata nel localStorage
  const saveSelectedCompany = (company: Company | null) => {
    if (company) {
      localStorage.setItem('selectedCompany', JSON.stringify(company))
    } else {
      localStorage.removeItem('selectedCompany')
    }
  }

  // Carica le aziende (solo per admin o limitato per client)
  const loadCompanies = useCallback(async () => {
    // Se non c'è un utente, non caricare nulla
    if (!user) {
      setLoading(false)
      return
    }

    try {
      let query = supabase
        .from('companies')
        .select('*')
        .order('name')

      // Solo i client con company_id vedono un'unica azienda
      if (user.role === 'client' && user.company_id) {
        query = query.eq('id', user.company_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Errore nel caricamento aziende:', error)
        return
      }

      setCompanies(data || [])

      // Logica di selezione automatica
      if (data && data.length > 0) {
        if (user.role === 'client') {
          // Per i client, seleziona sempre l'unica azienda disponibile
          console.log('🏢 Selezione automatica azienda per client:', data[0].name)
          setSelectedCompany(data[0])
        } else if (isEditorStaff && !hasInitialized.current) {
          // Admin e amministrazione: ripristina dal localStorage
          try {
            const savedCompany = localStorage.getItem('selectedCompany')
            if (savedCompany) {
              const company = JSON.parse(savedCompany)
              if (data.some(c => c.id === company.id)) {
                setSelectedCompany(company)
              }
            }
          } catch (err) {
            console.error('Errore nel caricamento azienda salvata:', err)
          }
        }
      }
      
      hasInitialized.current = true
    } catch (err) {
      console.error('Errore generale:', err)
    } finally {
      setLoading(false)
    }
  }, [user, isEditorStaff])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  // Carica i dati finanziari per l'azienda selezionata
  const loadFinancialData = useCallback(async (companyId: string, dataType: string, year?: number, month?: number) => {
    try {
      let query = supabase
        .from('financial_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('data_type', dataType)

      if (year) query = query.eq('year', year)
      if (month !== undefined) query = query.eq('month', month)

      const { data, error } = await query
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Errore nel caricamento dati finanziari:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Errore generale:', err)
      return null
    }
  }, [])

  // Salva dati finanziari
  const saveFinancialData = async (
    companyId: string,
    dataType: string,
    data: any,
    year: number,
    month?: number
  ) => {
    const { data: result, error } = await supabase
      .from('financial_data')
      .upsert({
        company_id: companyId,
        data_type: dataType,
        data,
        year,
        month
      })
      .select()

    if (error) {
      console.error('Errore nel salvataggio dati finanziari:', error)
      throw error
    }

    return result
  }

  // Ottieni i dati per CE Dettaglio Mensile
  const getCEDettaglioMensileData = useCallback(async (companyId: string, year?: number, month?: number) => {
    return await loadFinancialData(companyId, 'ce-dettaglio-mensile', year, month)
  }, [loadFinancialData])

  // Ottieni i dati per Source
  const getSourceData = useCallback(async (companyId: string, year?: number, month?: number) => {
    return await loadFinancialData(companyId, 'source', year, month)
  }, [loadFinancialData])

  // Wrapper per setSelectedCompany che salva nel localStorage
  const handleSetSelectedCompany = (company: Company | null) => {
    setSelectedCompany(company)
    saveSelectedCompany(company)
  }

  // Elimina dati finanziari
  const deleteFinancialData = async (
    companyId: string,
    year: number,
    dataType?: string | string[],
    month?: number
  ) => {
    let query = supabase
      .from('financial_data')
      .delete()
      .eq('company_id', companyId)
      .eq('year', year)

    if (dataType) {
        if (Array.isArray(dataType)) {
            query = query.in('data_type', dataType)
        } else {
            query = query.eq('data_type', dataType)
        }
    }
    if (month !== undefined) query = query.eq('month', month)

    const { error } = await query

    if (error) {
      console.error('Errore nella cancellazione dati finanziari:', error)
      throw error
    }
  }

  // Crea una nuova azienda
  const createCompany = async (name: string): Promise<Company | null> => {
    try {
      // Generate slug from name (lowercase, spaces to hyphens, remove special chars)
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, slug }])
        .select()
        .single()

      if (error) {
        console.error('Errore creazione azienda:', error)
        return null
      }

      if (data) {
        setCompanies(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        return data as Company
      }
      return null
    } catch (err) {
      console.error('Errore generale creazione azienda:', err)
      return null
    }
  }

  const deleteCompany = async (companyId: string): Promise<void> => {
    // Tabelle legacy senza ON DELETE CASCADE sul FK verso companies
    for (const table of ['financial_data', 'account_mappings', 'raw_imports'] as const) {
      const { error } = await supabase.from(table).delete().eq('company_id', companyId)
      if (error) throw error
    }

    const { error } = await supabase.from('companies').delete().eq('id', companyId)
    if (error) throw error

    setCompanies((prev) => prev.filter((c) => c.id !== companyId))
    if (selectedCompany?.id === companyId) {
      handleSetSelectedCompany(null)
    }
  }

  return (
    <FinancialDataContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany: handleSetSelectedCompany,
        createCompany,
        deleteCompany,
        loading,
        setLoading,
        loadFinancialData,
        saveFinancialData,
        deleteFinancialData,
        getCEDettaglioMensileData,
        getSourceData,
        loadCompanies,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  )
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext)
  if (context === undefined) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider')
  }
  return context
}

