import React, { useState, useEffect } from 'react'
import { useFinancialData } from '@/contexts/FinancialDataContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Check } from 'lucide-react'

export default function CompanySelector() {
  const { companies, selectedCompany, setSelectedCompany, loading } = useFinancialData()
  const [isOpen, setIsOpen] = useState(false)

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Caricamento aziende...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Seleziona Azienda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full justify-between"
          >
            <span>
              {selectedCompany ? selectedCompany.name : 'Seleziona un\'azienda'}
            </span>
            <Building2 className="w-4 h-4" />
          </Button>
          
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {/* Voce per deselezionare l'azienda */}
              <button
                onClick={() => {
                  setSelectedCompany(null)
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-muted flex items-center justify-between border-b"
              >
                <div>
                  <div className="font-medium text-muted-foreground">Nessuna azienda</div>
                  <div className="text-sm text-muted-foreground">Deseleziona</div>
                </div>
                {!selectedCompany && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
              
              {companies.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Nessuna azienda disponibile
                </div>
              ) : (
                companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setSelectedCompany(company)
                      setIsOpen(false)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-muted flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">{company.slug}</div>
                    </div>
                    {selectedCompany?.id === company.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        
        {selectedCompany ? (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {selectedCompany.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Azienda selezionata
            </span>
          </div>
        ) : (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-sm text-yellow-800">
                Seleziona un'azienda per visualizzare i dati
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
