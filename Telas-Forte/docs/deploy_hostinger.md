Prompt universal para o Codex
INSTRUÇÃO PADRÃO — DEPLOY HOSTINGER SEGURO

Objetivo:
Preparar o projeto para publicação na Hostinger usando pasta limpa CLEAN_DEPLOY e script deploy_hostinger.bat.

Nunca executar o deploy automaticamente.

Regra principal:
O servidor Hostinger usa como base o diretório public_html.
No WinSCP/FTP, a raiz da conexão já aponta para public_html.
Portanto, no deploy NÃO usar /public_html/ no caminho remoto.

Exemplo correto:
SERVER_PATH=porto-consorcio

Exemplo incorreto:
SERVER_PATH=/public_html/porto-consorcio

Antes de publicar:
1. Corrigir e validar o projeto local.
2. Confirmar visualmente no navegador.
3. Criar/atualizar CLEAN_DEPLOY.
4. Somente depois preparar deploy_hostinger.bat.
5. Não executar o deploy sem autorização expressa.

CLEAN_DEPLOY deve conter apenas os arquivos finais:
index.html
api_proxy.php, se existir
README.md, se necessário
assets/
imagens/
data/
docs/
outros arquivos públicos essenciais do projeto

Nunca incluir:
_REFERENCIAS_NAO_SUBIR/
REFERENCIAS NAO SUBIR/
deploy_hostinger.bat
winscp.ini
_config/
.env
node_modules/
.git/
arquivos antigos
backups
zips
prints
rascunhos
arquivos do Claude/Codex que não sejam públicos

Configuração do deploy:
Manter a conexão FTPS já validada.
Alterar apenas:
PROJECT_NAME
SERVER_PATH

Exemplos:
PROJECT_NAME=PORTO CONSORCIO
SERVER_PATH=porto-consorcio

PROJECT_NAME=ANTONIO MAURO
SERVER_PATH=propostas/antoniorossi

Usar synchronize remote -delete.
Nunca usar:
put *.html
put *.php
put *.pdf

Motivo:
put envia arquivos soltos indevidos.
synchronize remote -delete publica exatamente o conteúdo de CLEAN_DEPLOY.

Ao finalizar, informar:
- arquivos copiados para CLEAN_DEPLOY;
- destino configurado;
- confirmação de que deploy não foi executado;
- confirmação de que não há arquivos proibidos no pacote.
