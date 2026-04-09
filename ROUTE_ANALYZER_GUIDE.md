# Route Analyzer - Guia Completo

## Visão Geral

O Route Analyzer é uma ferramenta poderosa que permite aos entregadores carregar suas rotas de entrega e detectar automaticamente endereços com problemas relatados, antes de iniciar as entregas.

## Funcionalidades Principais

### 1. Upload de Arquivo de Rota

O sistema aceita dois formatos de arquivo:

- **Excel (.xlsx)** - Planilhas do Excel
- **CSV (.csv)** - Arquivos de texto separados por vírgula

#### Estrutura do Arquivo

O arquivo deve conter as seguintes colunas (em português ou inglês):

**Opção 1: Endereço Completo**
- `Address` ou `Endereco` - Endereço completo da entrega

**Opção 2: Endereço Separado**
- `Street` ou `Rua` - Nome da rua
- `Number` ou `Numero` - Número do endereço
- `City` ou `Cidade` (opcional) - Nome da cidade

#### Exemplo de Arquivo CSV:

```csv
Address
Rua das Flores, 123, São Paulo
Av. Paulista, 1000, São Paulo
Rua Augusta, 456, São Paulo
```

ou

```csv
Street,Number,City
Rua das Flores,123,São Paulo
Av. Paulista,1000,São Paulo
Rua Augusta,456,São Paulo
```

### 2. Processamento de Endereços

Ao fazer upload de um arquivo, o sistema:

1. **Lê o arquivo** - Extrai todos os endereços da planilha
2. **Normaliza os endereços** - Remove acentos, caracteres especiais
3. **Busca no banco de dados** - Compara com endereços cadastrados
4. **Calcula o risco** - Determina o nível de risco de cada entrega

### 3. Classificação de Risco

Cada endereço é classificado em 4 níveis de risco:

| Cor | Nível | Pontuação | Descrição |
|-----|-------|-----------|-----------|
| 🟢 Verde | Seguro | 0-2 | Endereço sem problemas relatados |
| 🟡 Amarelo | Atenção | 3-5 | 1-2 relatos de problemas |
| 🟠 Laranja | Risco Moderado | 6-8 | 3-5 relatos de problemas |
| 🔴 Vermelho | Alto Risco | 9-10 | 6+ relatos de problemas |

### 4. Tela de Resultados

A tela de análise mostra:

#### Resumo da Rota
- Total de endereços
- Quantidade de endereços seguros
- Quantidade de endereços com atenção
- Quantidade de endereços de risco moderado
- Quantidade de endereços de alto risco

#### Lista Detalhada
Para cada endereço, você verá:
- Endereço completo
- Indicador visual de risco (barra colorida)
- Pontuação de risco (0-10)
- Número de relatos
- Botões de ação

### 5. Alertas de Segurança

Se endereços de alto risco forem detectados:

- ⚠️ **Banner de alerta** destacado no topo
- **Notificação popup** informando quantidade de endereços de risco
- **Lista ordenada** com endereços de maior risco primeiro

### 6. Ações Disponíveis

Para cada endereço na lista, você pode:

#### Abrir no Google Maps
- Abre o endereço diretamente no Google Maps
- Permite navegação imediata
- Funciona em qualquer dispositivo

#### Ver Detalhes
- Mostra informações completas do endereço
- Exibe todos os relatos de problemas
- Mostra dicas de outros entregadores

### 7. Desempenho

O Route Analyzer foi otimizado para:

- ✅ Processar **100+ endereços** rapidamente
- ✅ Busca eficiente no banco de dados
- ✅ Interface responsiva durante o processamento
- ✅ Feedback em tempo real

## Como Usar

### Passo 1: Preparar o Arquivo

1. Exporte sua rota da plataforma de entrega (iFood, Rappi, Shopee, etc.)
2. Certifique-se que o arquivo está em formato .xlsx ou .csv
3. Verifique se as colunas de endereço estão presentes

### Passo 2: Fazer Upload

1. Abra o app AntiPNR
2. Navegue até a aba **"Rota"**
3. Toque em **"Selecionar Arquivo"**
4. Escolha seu arquivo de rota
5. Toque em **"Analisar Rota"**

### Passo 3: Revisar Resultados

1. Veja o resumo geral da sua rota
2. Identifique endereços de risco
3. Leia os alertas de segurança
4. Planeje sua rota evitando horários de risco

### Passo 4: Tomar Ação

Para endereços de alto risco:

- 📱 Ligue antes de sair para entrega
- 🚗 Planeje rotas alternativas
- ⏰ Escolha horários mais seguros
- 👥 Considere ir acompanhado
- 📝 Leia as dicas de outros entregadores

## Tecnologias Utilizadas

### Frontend
- **React Native** - Interface móvel nativa
- **Expo** - Framework de desenvolvimento
- **TypeScript** - Tipagem estática

### Processamento de Arquivos
- **xlsx** - Leitura de arquivos Excel
- **papaparse** - Leitura de arquivos CSV
- **expo-document-picker** - Seleção de arquivos

### Backend
- **Supabase** - Banco de dados PostgreSQL
- **Row Level Security** - Segurança de dados
- **Indexed Search** - Busca otimizada

## Estrutura de Arquivos

```
services/
  routeAnalyzerService.ts    # Lógica principal do analisador

components/
  RouteUploadScreen.tsx      # Tela de upload de arquivo
  RouteAnalysisResultScreen.tsx  # Tela de resultados

app/(tabs)/
  route.tsx                  # Aba de rotas (integração)
```

## API do Service

### Funções Principais

#### `parseExcelFile(fileUri: string)`
Lê um arquivo Excel e extrai os endereços.

```typescript
const addresses = await parseExcelFile(fileUri);
```

#### `parseCSVFile(fileUri: string)`
Lê um arquivo CSV e extrai os endereços.

```typescript
const addresses = await parseCSVFile(fileUri);
```

#### `analyzeRouteAddresses(addresses: RouteAddress[])`
Analisa uma lista de endereços e calcula os riscos.

```typescript
const result = await analyzeRouteAddresses(addresses);
```

#### `analyzeRouteFile(fileUri: string, fileType: 'xlsx' | 'csv')`
Função principal que combina leitura e análise.

```typescript
const result = await analyzeRouteFile(fileUri, 'xlsx');
```

### Tipos de Dados

#### `RouteAddress`
```typescript
interface RouteAddress {
  originalAddress: string;
  street?: string;
  number?: string;
  city?: string;
  normalizedAddress: string;
}
```

#### `RouteAddressWithRisk`
```typescript
interface RouteAddressWithRisk extends RouteAddress {
  matchedAddressId?: string;
  riskScore: number;
  reportCount: number;
  riskLevel: 'safe' | 'attention' | 'moderate' | 'high';
  riskColor: string;
  hasMatch: boolean;
}
```

#### `RouteAnalysisResult`
```typescript
interface RouteAnalysisResult {
  totalAddresses: number;
  safeAddresses: number;
  attentionAddresses: number;
  moderateRiskAddresses: number;
  highRiskAddresses: number;
  addresses: RouteAddressWithRisk[];
  processedAt: Date;
}
```

## Normalização de Endereços

O sistema normaliza endereços para melhor matching:

1. **Remove acentos** - "São Paulo" → "Sao Paulo"
2. **Converte para minúsculas** - "RUA DAS FLORES" → "rua das flores"
3. **Remove caracteres especiais** - "Rua #123" → "Rua 123"
4. **Padroniza espaços** - "Rua   das    Flores" → "Rua das Flores"

## Algoritmo de Matching

O sistema usa busca por similaridade:

```sql
SELECT * FROM addresses
WHERE normalized_address ILIKE '%endereco_normalizado%'
```

Isso permite encontrar endereços mesmo com pequenas variações na escrita.

## Cálculo de Risco

Baseado na pontuação de risco do banco de dados:

```typescript
if (riskScore >= 9) return 'high';
else if (riskScore >= 6) return 'moderate';
else if (riskScore >= 3) return 'attention';
else return 'safe';
```

## Otimizações de Performance

### 1. Busca com Índice
- Uso de índices no campo `normalized_address`
- Consultas otimizadas com `ILIKE`

### 2. Processamento Assíncrono
- Múltiplas buscas em paralelo
- Não bloqueia a interface durante processamento

### 3. Limitação de Resultados
- `LIMIT 1` nas consultas de endereço
- Reduz transferência de dados

## Limitações Conhecidas

1. **Matching perfeito não garantido** - Endereços com grafia muito diferente podem não ser encontrados
2. **Requer conexão com internet** - Necessário para buscar no banco de dados
3. **Formatos de arquivo** - Suporta apenas .xlsx e .csv

## Melhorias Futuras

- [ ] Suporte a mais formatos de arquivo (Google Sheets, JSON)
- [ ] Correção automática de endereços
- [ ] Integração com APIs de geolocalização
- [ ] Cache de resultados para uso offline
- [ ] Exportação de relatório em PDF
- [ ] Notificações push para rotas perigosas
- [ ] Histórico de análises anteriores

## Troubleshooting

### Problema: Arquivo não é reconhecido

**Solução:**
- Verifique se o arquivo está em formato .xlsx ou .csv
- Certifique-se de que as colunas estão nomeadas corretamente
- Tente exportar novamente da plataforma de entrega

### Problema: Nenhum endereço encontrado

**Solução:**
- Verifique se o arquivo contém a coluna "Address" ou "Street"
- Certifique-se de que há dados no arquivo
- Abra o arquivo e verifique se está formatado corretamente

### Problema: Análise muito lenta

**Solução:**
- Verifique sua conexão com internet
- Reduza o número de endereços no arquivo
- Tente novamente mais tarde

### Problema: Endereços não são encontrados no banco

**Solução:**
- Os endereços só aparecem se já foram relatados
- Endereços novos não terão histórico
- Você pode criar o primeiro relato para esse endereço

## Suporte

Para dúvidas ou problemas com o Route Analyzer:

1. Verifique este guia primeiro
2. Consulte a documentação do backend (BACKEND_DOCUMENTATION.md)
3. Reporte bugs através do sistema de feedback do app

## Conclusão

O Route Analyzer é uma ferramenta essencial para aumentar a segurança dos entregadores. Use-o diariamente antes de iniciar suas entregas para:

- ✅ Identificar endereços problemáticos
- ✅ Planejar rotas mais seguras
- ✅ Economizar tempo evitando problemas
- ✅ Aumentar sua segurança pessoal

**Entregue com mais segurança usando o AntiPNR! 🚗📦**
