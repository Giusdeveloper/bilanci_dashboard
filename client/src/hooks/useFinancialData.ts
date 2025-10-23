import { useState, useEffect, useCallback } from 'react'
import { supabase, FinancialData, Company } from '@/lib/supabase'
import { useAuth } from './useAuth'

export const useFinancialData = () => {
  const { user, isAdmin } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  

  // Funzione per salvare l'azienda selezionata nel localStorage
  const saveSelectedCompany = (company: Company | null) => {
    if (company) {
      localStorage.setItem('selectedCompany', JSON.stringify(company))
    } else {
      localStorage.removeItem('selectedCompany')
    }
  }

  // Funzione per caricare l'azienda selezionata dal localStorage
  const loadSelectedCompany = () => {
    try {
      const saved = localStorage.getItem('selectedCompany')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Errore nel caricamento azienda salvata:', error)
    }
    return null
  }

  // Carica le aziende (solo per admin)
  useEffect(() => {
    const loadCompanies = async () => {
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
        
        // Carica l'azienda salvata dal localStorage
        const savedCompany = loadSelectedCompany()
        if (savedCompany && data) {
          // Verifica che l'azienda salvata esista ancora nella lista
          const companyExists = data.find(c => c.id === savedCompany.id)
          if (companyExists) {
            setSelectedCompany(savedCompany)
          }
        }
      } catch (err) {
        console.error('Errore generale:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCompanies()
  }, [isAdmin])

  // Carica i dati finanziari per l'azienda selezionata - STABILIZZATA
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
  }, []) // Nessuna dipendenza perché usa solo supabase

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

  // Ottieni i dati per la dashboard - COMPLETAMENTE STABILE
  const getDashboardData = useCallback(async (companyId: string) => {
    // Implementazione diretta senza dipendenze
    try {
      const { data, error } = await supabase
        .from('financial_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('data_type', 'dashboard')
        .eq('year', 2025)
        .eq('month', 8)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Errore nel caricamento dati dashboard:', error)
        return null
      }
      
      return data
    } catch (err) {
      console.error('Errore generale getDashboardData:', err)
      return null
    }
  }, []) // NESSUNA DIPENDENZA - completamente stabile

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

  // Debug per vedere lo stato (solo quando cambia)
  // console.log('🏢 useFinancialData: Stato:', { 
  //   companies: companies.length, 
  //   selectedCompany: selectedCompany?.name, 
  //   loading 
  // })

  // Wrapper per setSelectedCompany che salva nel localStorage
  const handleSetSelectedCompany = (company: Company | null) => {
    setSelectedCompany(company)
    saveSelectedCompany(company)
  }

  return {
    companies,
    selectedCompany,
    setSelectedCompany: handleSetSelectedCompany,
    loading,
    setLoading,
    loadFinancialData,
    saveFinancialData,
    getDashboardData,
    getCEDettaglioData,
    getCEDettaglioMensileData,
    getCESinteticoData,
    getCESinteticoMensileData
  }
}
