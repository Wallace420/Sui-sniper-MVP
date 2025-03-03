---

#Mainnet Fullnode
1. Install Docker-compose:
wget -q -O - https://bit.ly/3OcdIfO | bash -s -- 2.17.0

2. Clone repository:
cd && git clone https://github.com/Staketab/sui-node-mainnet.git
cd sui-node-mainnet

3. Download Genesis:
wget -O $HOME/sui-node-mainnet/genesis.blob https://github.com/MystenLabs/sui-genesis/raw/main/mainnet/genesis.blob

4. Start the Node:
Run this command to start the node:

docker-compose up -d

#REDEPLOY SUI NODE
After releasing new releases in Sui, you need to redeploy the node with the commands below:

cd sui-node-mainnet
docker-compose pull
docker-compose down --volumes
rm -r $HOME/sui-node-mainnet/suidb $HOME/sui-node-mainnet/genesis.blob
wget -O $HOME/sui-node-mainnet/genesis.blob https://github.com/MystenLabs/sui-genesis/raw/main/mainnet/genesis.blob
docker-compose up -d
docker-compose logs -f sui

Other commands:
Stop docker-compose

docker-compose down

Docker-compose logs

docker-compose logs -f sui

or
docker logs --follow sui -f --tail 100

Check the JSON-RPC node version:

curl -X POST http://127.0.0.1:9000 -H "Content-Type: application/json" --data '{"jsonrpc":"2.0", "method":"rpc.discover", "id":1}' | jq '.result.info.version'

Check the number of node transactions:

curl -X POST http://127.0.0.1:9000 -H "Content-Type: application/json" --data '{"jsonrpc":"2.0", "method":"sui_getTotalTransactionBlocks", "
---