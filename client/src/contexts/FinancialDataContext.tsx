import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { supabase, FinancialData, Company } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface FinancialDataContextType {
  companies: Company[]
  selectedCompany: Company | null
  setSelectedCompany: (company: Company | null) => void
  createCompany: (name: string) => Promise<Company | null>
  loading: boolean
  setLoading: (loading: boolean) => void
  loadFinancialData: (companyId: string, dataType: string, year?: number, month?: number) => Promise<any>
  saveFinancialData: (companyId: string, dataType: string, data: any, year: number, month?: number) => Promise<any>
  deleteFinancialData: (companyId: string, year: number) => Promise<void>
  getDashboardData: (companyId: string) => Promise<any>
  getCEDettaglioData: (companyId: string) => Promise<FinancialData[] | null>
  getCEDettaglioMensileData: (companyId: string) => Promise<FinancialData[] | null>
  getCESinteticoData: (companyId: string) => Promise<FinancialData[] | null>
  getCESinteticoMensileData: (companyId: string) => Promise<FinancialData[] | null>
  getPartitariData: (companyId: string) => Promise<FinancialData[] | null>
  getSourceData: (companyId: string) => Promise<FinancialData[] | null>
  loadCompanies: () => Promise<void>
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined)

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth()
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

  // Carica le aziende (solo per admin)
  const loadCompanies = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) {
        console.error('Errore nel caricamento aziende:', error)
        return
      }

      setCompanies(data || [])

      // Carica l'azienda selezionata dal localStorage se esiste
      if (!hasInitialized.current) {
        try {
          const savedCompany = localStorage.getItem('selectedCompany')
          if (savedCompany) {
            const company = JSON.parse(savedCompany)
            // Verifica che l'azienda esista ancora nella lista
            if (data && data.some(c => c.id === company.id)) {
              console.log('📋 Azienda selezionata caricata dal localStorage:', company.name)
              setSelectedCompany(company)
            } else {
              console.log('⚠️  Azienda salvata non trovata nella lista, rimuovo dal localStorage')
              localStorage.removeItem('selectedCompany')
            }
          }
        } catch (err) {
          console.error('Errore nel caricamento azienda salvata:', err)
          localStorage.removeItem('selectedCompany')
        }
        hasInitialized.current = true
      }
    } catch (err) {
      console.error('Errore generale:', err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

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

      const { data, error } = await query.order('created_at', { ascending: false })

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

  // Ottieni i dati per la dashboard
  const getDashboardData = useCallback(async (companyId: string) => {
    try {
      // Strategia sistemica: Recupera l'ultimo dato disponibile in assoluto
      // Ordina per anno (decrescente) e poi per mese (decrescente)
      // In questo modo otteniamo sempre i dati più recenti caricati per l'azienda
      const { data, error } = await supabase
        .from('financial_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('data_type', 'dashboard')
        .order('year', { ascending: false })
        .order('month', { ascending: false, nullsFirst: false }) // nullsFirst: false mette i mesi nulli (annuali) dopo i mesi specifici se necessario, o viceversa. 
        // Nota: Su Supabase/Postgres l'ordinamento dei null dipende dalla configurazione, ma specificare l'ordine temporale è la chiave.
        // Se vogliamo dare priorità al dato mensile più recente:
        .limit(1)

      if (error) {
        console.error('Errore nel caricamento dati dashboard:', error)
        return null
      }

      if (data && data.length > 0) {
        const record = data[0];
        console.log(`📊 Dati dashboard caricati per azienda ${companyId}:`, {
          anno: record.year,
          mese: record.month,
          tipo: record.data_type
        });
      } else {
        console.log(`⚠️ Nessun dato dashboard trovato per azienda ${companyId}`);
      }

      return data
    } catch (err) {
      console.error('Errore generale getDashboardData:', err)
      return null
    }
  }, [])

  // Ottieni i dati per CE Dettaglio
  const getCEDettaglioData = async (companyId: string) => {
    return await loadFinancialData(companyId, 'ce-dettaglio', 2025)
  }

  // Ottieni i dati per CE Dettaglio Mensile
  const getCEDettaglioMensileData = async (companyId: string) => {
    return await loadFinancialData(companyId, 'ce-dettaglio-mensile', 2025)
  }

  // Ottieni i dati per CE Sintetico
  const getCESinteticoData = async (companyId: string) => {
    return await loadFinancialData(companyId, 'ce-sintetico', 2025)
  }

  // Ottieni i dati per CE Sintetico Mensile
  const getCESinteticoMensileData = async (companyId: string) => {
    return await loadFinancialData(companyId, 'ce-sintetico-mensile', 2025)
  }

  // Ottieni i dati per Partitari
  const getPartitariData = async (companyId: string) => {
    return await loadFinancialData(companyId, 'partitari', 2025)
  }

  // Ottieni i dati per Source
  const getSourceData = useCallback(async (companyId: string) => {
    // I dati Source sono salvati con data_type='source'
    // Recuperiamo l'ultimo disponibile
    const data = await loadFinancialData(companyId, 'source')
    return data
  }, [loadFinancialData])

  // Wrapper per setSelectedCompany che salva nel localStorage
  const handleSetSelectedCompany = (company: Company | null) => {
    setSelectedCompany(company)
    saveSelectedCompany(company)
  }

  // Elimina dati finanziari
  const deleteFinancialData = async (
    companyId: string,
    year: number
  ) => {
    const { error } = await supabase
      .from('financial_data')
      .delete()
      .eq('company_id', companyId)
      .eq('year', year)

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

  return (
    <FinancialDataContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany: handleSetSelectedCompany,
        createCompany,
        loading,
        setLoading,
        loadFinancialData,
        saveFinancialData,
        deleteFinancialData,
        getDashboardData,
        getCEDettaglioData,
        getCEDettaglioMensileData,
        getCESinteticoData,
        getCESinteticoMensileData,
        getSourceData,
        getPartitariData,
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

