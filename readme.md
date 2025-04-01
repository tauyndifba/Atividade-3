# Distributed Group Chat System

Este sistema implementa um chat em grupo distribuído com recursos avançados de sistemas distribuídos:

1. **Comunicação em Grupo com Multicast**: Utiliza sockets UDP com protocolo multicast IP
2. **Replicação de Dados e Consistência Eventual**: Armazena réplicas de mensagens localmente
3. **Controle de Concorrência com Exclusão Mútua**: Implementa algoritmo de Token Ring
4. **Tolerância a Falhas com Checkpoints**: Permite restauração após falhas

## Requisitos

- Node.js (versão 14 ou superior)

## Instalação

```bash
npm install
```

## Execução

Para iniciar vários nós do sistema (são necessários pelo menos 3 para demonstração):

```bash
# Terminal 1 - Inicia nó 1 (inicia com o token)
npm run node1

# Terminal 2 - Inicia nó 2
npm run node2

# Terminal 3 - Inicia nó 3
npm run node3
```

Alternativamente, você pode iniciar os nós manualmente:

```bash
node server.js 1
node server.js 2
node server.js 3
```

## Comandos Disponíveis

Durante a execução do nó, os seguintes comandos estão disponíveis:

- **Enviar mensagem**: Digite o texto e pressione Enter (requer posse do token)
- **Solicitar token**: Digite `token` para obter acesso exclusivo
- **Criar checkpoint manual**: Digite `checkpoint`
- **Forçar reconciliação**: Digite `reconcile`
- **Sair**: Digite `exit`

## Detalhes da Implementação

### 1. Comunicação em Grupo com Multicast

O sistema utiliza sockets UDP com endereço multicast `224.1.1.1` na porta `5007`. Quando um nó envia uma mensagem, todos os demais nós a recebem simultaneamente.

### 2. Replicação de Dados e Consistência Eventual

Cada mensagem recebida é armazenada em múltiplos arquivos de réplica local. Um delay artificial é adicionado para simular a entrega fora de ordem.

A reconciliação periódica garante que todas as réplicas eventualmente contenham os mesmos dados, implementando o conceito de consistência eventual.

### 3. Controle de Concorrência com Exclusão Mútua

O sistema implementa um algoritmo de Token Ring para garantir exclusão mútua. Apenas o nó que possui o token pode enviar mensagens ao grupo. Quando termina, ele passa o token para o próximo nó que o solicitou.

### 4. Tolerância a Falhas com Checkpoints

Checkpoints periódicos salvam o estado do nó (mensagens, fila de requisições, posse do token). Em caso de falha, ao reiniciar, o nó restaura seu estado a partir do último checkpoint.

## Estrutura do Projeto

- **server.js**: Implementação completa do sistema
- **node_X_data/**: Diretório de dados para cada nó (X é o ID do nó)
  - **replicaX.json**: Arquivos de réplica
  - **checkpoint.json**: Arquivo de checkpoint

## Funcionamento

1. Ao iniciar, cada nó anuncia sua presença
2. Apenas o nó que possui o token pode enviar mensagens
3. Os nós solicitam o token quando desejam enviar mensagens
4. Checkpoints são criados periodicamente
5. A reconciliação de réplicas ocorre a cada 15 segundos

## Logs e Monitoramento

O sistema exibe logs detalhados sobre:
- Mensagens recebidas e enviadas
- Solicitações e concessões de token
- Criação de checkpoints
- Processo de reconciliação