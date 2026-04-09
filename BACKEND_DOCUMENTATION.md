# AntiPNR - Documentação do Backend

## Visão Geral

O AntiPNR é uma aplicação colaborativa de segurança para entregadores. O backend foi construído usando Supabase (PostgreSQL) com Row Level Security (RLS) e funciona totalmente serverless.

## Arquitetura do Banco de Dados

### Tabelas

#### 1. **addresses** (Endereços)
Armazena todos os endereços de entrega com informações de risco.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único (chave primária) |
| `address_text` | text | Endereço completo como texto |
| `normalized_address` | text | Endereço normalizado para buscas |
| `latitude` | numeric | Coordenada de latitude GPS |
| `longitude` | numeric | Coordenada de longitude GPS |
| `city` | text | Nome da cidade |
| `zone` | text | Zona/bairro geográfico |
| `risk_score` | numeric | Pontuação de risco (0-10) |
| `total_reports` | integer | Total de relatos para este endereço |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Data da última atualização |

**Índices:**
- Índice nas coordenadas (latitude, longitude) para consultas espaciais
- Índice no risk_score para ordenação
- Unique constraint no normalized_address

#### 2. **reports** (Relatos)
Armazena relatos individuais de incidentes dos entregadores.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único (chave primária) |
| `address_id` | uuid | Referência à tabela addresses |
| `driver_id` | uuid | Referência ao usuário (auth.users) |
| `issue_type` | text | Tipo: 'PNR', 'Difficult Location', 'Customer Dispute', 'Other' |
| `note` | text | Nota opcional com detalhes |
| `confirmations_count` | integer | Número de confirmações |
| `is_verified` | boolean | Se o relato foi verificado (3+ confirmações) |
| `created_at` | timestamptz | Data de criação |

**Índices:**
- Índice em address_id para buscas rápidas
- Índice em driver_id para consultas do usuário
- Índice em created_at para ordenação

#### 3. **confirmations** (Confirmações)
Permite que entregadores confirmem ou neguem relatos de outros.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único (chave primária) |
| `report_id` | uuid | Referência à tabela reports |
| `driver_id` | uuid | Referência ao usuário (auth.users) |
| `confirmation_type` | text | Tipo: 'confirm' ou 'deny' |
| `created_at` | timestamptz | Data de criação |

**Constraints:**
- Unique(report_id, driver_id) - Um usuário não pode confirmar o mesmo relato duas vezes

#### 4. **tips** (Dicas)
Dicas úteis de entrega compartilhadas por entregadores experientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único (chave primária) |
| `address_id` | uuid | Referência à tabela addresses |
| `driver_id` | uuid | Referência ao usuário (auth.users) |
| `tip_text` | text | Conteúdo da dica |
| `likes_count` | integer | Número de curtidas |
| `created_at` | timestamptz | Data de criação |

**Índices:**
- Índice em address_id
- Índice em driver_id

#### 5. **tip_likes** (Curtidas em Dicas)
Rastreia quais usuários curtiram quais dicas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único (chave primária) |
| `tip_id` | uuid | Referência à tabela tips |
| `driver_id` | uuid | Referência ao usuário (auth.users) |
| `created_at` | timestamptz | Data de criação |

**Constraints:**
- Unique(tip_id, driver_id) - Um usuário não pode curtir a mesma dica duas vezes

---

## Lógica de Negócio e Triggers

### 1. Cálculo Automático de Risco

A pontuação de risco é calculada automaticamente através do trigger `update_risk_on_report`:

**Fórmula:**
```
risk_score = MIN(10, COUNT(reports) * 1.5 + SUM(verified_reports * 2))
```

**Níveis de Risco:**
- **0-2**: Verde (Seguro)
- **3-5**: Amarelo (Atenção)
- **6-8**: Laranja (Risco Moderado)
- **9-10**: Vermelho (Alto Risco)

**Trigger:** `update_risk_on_report`
- Dispara em: INSERT, UPDATE ou DELETE em reports
- Função: `update_address_risk_score()`
- Atualiza automaticamente: total_reports, risk_score, updated_at

### 2. Sistema de Confirmações

Os relatos podem ser confirmados por outros entregadores para verificação da comunidade.

**Trigger:** `update_confirmation_trigger`
- Dispara em: INSERT ou DELETE em confirmations
- Função: `update_confirmation_count()`
- Lógica:
  - Incrementa `confirmations_count` quando uma confirmação é adicionada
  - Define `is_verified = true` quando confirmations_count >= 3
  - Decrementa count quando uma confirmação é removida

### 3. Contador de Curtidas

As curtidas em dicas são contadas automaticamente.

**Trigger:** `update_tip_likes_trigger`
- Dispara em: INSERT ou DELETE em tip_likes
- Função: `update_tip_likes_count()`
- Atualiza o campo `likes_count` na tabela tips

---

## Segurança (Row Level Security)

Todas as tabelas têm RLS habilitado. Políticas:

### Tabela: addresses
- ✅ **SELECT**: Qualquer usuário autenticado pode visualizar
- ✅ **INSERT**: Qualquer usuário autenticado pode inserir
- ✅ **UPDATE**: Qualquer usuário autenticado pode atualizar
- ❌ **DELETE**: Não permitido

### Tabela: reports
- ✅ **SELECT**: Qualquer usuário autenticado pode visualizar
- ✅ **INSERT**: Usuários podem criar seus próprios relatos
- ✅ **UPDATE**: Usuários podem atualizar apenas seus próprios relatos
- ✅ **DELETE**: Usuários podem deletar apenas seus próprios relatos

### Tabela: confirmations
- ✅ **SELECT**: Qualquer usuário autenticado pode visualizar
- ✅ **INSERT**: Usuários podem criar confirmações
- ❌ **UPDATE**: Não permitido
- ✅ **DELETE**: Usuários podem deletar suas próprias confirmações

### Tabela: tips
- ✅ **SELECT**: Qualquer usuário autenticado pode visualizar
- ✅ **INSERT**: Usuários podem criar suas próprias dicas
- ✅ **UPDATE**: Usuários podem atualizar apenas suas próprias dicas
- ✅ **DELETE**: Usuários podem deletar apenas suas próprias dicas

### Tabela: tip_likes
- ✅ **SELECT**: Qualquer usuário autenticado pode visualizar
- ✅ **INSERT**: Usuários podem curtir dicas
- ❌ **UPDATE**: Não permitido
- ✅ **DELETE**: Usuários podem remover suas próprias curtidas

---

## Services (Camada de Aplicação)

### addressService.ts

**Funções disponíveis:**

```typescript
// Buscar endereços por texto
searchAddress(query: string): Promise<Address[]>

// Obter endereço por ID
getAddressById(id: string): Promise<Address | null>

// Criar ou obter endereço existente
createOrGetAddress(addressData): Promise<Address>

// Listar endereços de alto risco
getHighRiskAddresses(limit?: number): Promise<Address[]>

// Analisar rota com múltiplos endereços
analyzeRoute(addresses: string[]): Promise<RouteAnalysis>
```

### reportService.ts

**Funções disponíveis:**

```typescript
// Criar novo relato
createReport(reportData): Promise<Report>

// Obter relatos de um endereço
getReportsByAddress(addressId: string): Promise<Report[]>

// Obter relatos recentes
getRecentReports(limit?: number): Promise<Report[]>

// Deletar relato próprio
deleteReport(reportId: string): Promise<void>

// Obter estatísticas de relatos
getReportStats(): Promise<ReportStats>
```

### tipService.ts

**Funções disponíveis:**

```typescript
// Criar nova dica
createTip(tipData): Promise<Tip>

// Obter dicas de um endereço
getTipsByAddress(addressId: string): Promise<Tip[]>

// Obter dicas recentes
getRecentTips(limit?: number): Promise<Tip[]>

// Deletar dica própria
deleteTip(tipId: string): Promise<void>

// Curtir dica
likeTip(tipId: string): Promise<void>

// Descurtir dica
unlikeTip(tipId: string): Promise<void>

// Verificar se usuário curtiu dica
hasUserLikedTip(tipId: string): Promise<boolean>
```

### confirmationService.ts

**Funções disponíveis:**

```typescript
// Criar confirmação
createConfirmation(reportId: string, type: 'confirm' | 'deny'): Promise<Confirmation>

// Obter confirmações de um relato
getConfirmationsByReport(reportId: string): Promise<Confirmation[]>

// Deletar confirmação própria
deleteConfirmation(confirmationId: string): Promise<void>

// Verificar se usuário já confirmou
hasUserConfirmed(reportId: string): Promise<boolean>
```

---

## Fluxo de Dados

### 1. Busca de Endereço

```
Usuário digita endereço
    ↓
searchAddress() busca na tabela addresses
    ↓
Se encontrado: retorna dados + risk_score
Se não encontrado: usuário pode criar novo endereço
```

### 2. Criação de Relato

```
Usuário cria relato
    ↓
createReport() insere em reports
    ↓
TRIGGER dispara automaticamente
    ↓
update_address_risk_score() recalcula risco
    ↓
Atualiza total_reports e risk_score em addresses
```

### 3. Confirmação de Relato

```
Entregador visualiza relato de outro
    ↓
createConfirmation() com 'confirm' ou 'deny'
    ↓
TRIGGER dispara automaticamente
    ↓
update_confirmation_count() atualiza contador
    ↓
Se confirmations_count >= 3: is_verified = true
    ↓
Relatos verificados têm peso maior no cálculo de risco
```

### 4. Sistema de Dicas

```
Entregador adiciona dica útil
    ↓
createTip() insere em tips
    ↓
Outros entregadores podem curtir
    ↓
likeTip() insere em tip_likes
    ↓
TRIGGER atualiza likes_count automaticamente
    ↓
Dicas são ordenadas por likes_count
```

---

## Escalabilidade e Performance

### Índices Implementados

1. **addresses**: coordenadas, risk_score
2. **reports**: address_id, driver_id, created_at
3. **tips**: address_id, driver_id
4. **confirmations**: report_id
5. **tip_likes**: tip_id

### Otimizações

- Uso de `maybeSingle()` ao invés de `single()` para evitar erros
- Consultas com `limit` para paginação
- Índices em campos frequentemente consultados
- Foreign keys com `ON DELETE CASCADE` para integridade

### Considerações Futuras

- Implementar cache para endereços de alto risco
- Adicionar geolocalização para busca por proximidade
- Implementar rate limiting para evitar spam
- Adicionar sistema de reputação de entregadores

---

## Variáveis de Ambiente

```env
EXPO_PUBLIC_SUPABASE_URL=sua_url_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

---

## Exemplo de Uso Completo

```typescript
import { searchAddress, createOrGetAddress } from './services/addressService';
import { createReport } from './services/reportService';
import { createTip } from './services/tipService';

// 1. Buscar endereço
const addresses = await searchAddress('Rua Principal 123');

// 2. Se não existir, criar
const address = await createOrGetAddress({
  address_text: 'Rua Principal 123, São Paulo',
  normalized_address: 'rua principal 123 sao paulo',
  latitude: -23.5505,
  longitude: -46.6333,
  city: 'São Paulo',
  zone: 'Centro'
});

// 3. Criar relato
const report = await createReport({
  address_id: address.id,
  issue_type: 'PNR',
  note: 'Cliente não estava em casa'
});

// 4. Adicionar dica útil
const tip = await createTip({
  address_id: address.id,
  tip_text: 'Ligar antes de subir, prédio sem porteiro'
});
```

---

## Monitoramento

Para monitorar o sistema:

1. **Total de endereços cadastrados:**
```sql
SELECT COUNT(*) FROM addresses;
```

2. **Endereços de alto risco:**
```sql
SELECT * FROM addresses WHERE risk_score >= 6 ORDER BY risk_score DESC;
```

3. **Relatos por tipo:**
```sql
SELECT issue_type, COUNT(*) as total
FROM reports
GROUP BY issue_type;
```

4. **Engajamento (relatos + dicas + confirmações):**
```sql
SELECT
  (SELECT COUNT(*) FROM reports) as total_reports,
  (SELECT COUNT(*) FROM tips) as total_tips,
  (SELECT COUNT(*) FROM confirmations) as total_confirmations;
```

---

## Conclusão

O backend do AntiPNR foi projetado para ser:

- ✅ **Colaborativo**: Toda a comunidade contribui
- ✅ **Automático**: Triggers calculam tudo automaticamente
- ✅ **Seguro**: RLS protege os dados
- ✅ **Escalável**: Índices e estrutura otimizada
- ✅ **Simples**: API fácil de usar nos services

O sistema está pronto para uso em produção e pode escalar para milhares de entregadores sem problemas de performance.
