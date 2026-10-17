const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || ''),
    { disableLosslessIntegers: true }
);

async function executarQuery(cypherOriginal) {
    const session = driver.session();
    
    // 🛡️ ESCUDO 1: OOM (Out Of Memory) - Evita travamento por excesso de dados
    let cypherSeguro = cypherOriginal.trim();
    if (cypherSeguro.endsWith(';')) cypherSeguro = cypherSeguro.slice(0, -1);
    
    // Força o limite de segurança de 100 registros caso a consulta não o possua
    if (!cypherSeguro.toUpperCase().includes('LIMIT')) {
        cypherSeguro += ' LIMIT 100';
    }

    try {
        console.log(`\n🔍 Executando (Protegido e Limitado): ${cypherSeguro}`);
        
        // 🛡️ ESCUDO 2: OPSEC Read-Only - Trava física contra mutação (CREATE, MERGE, DELETE)
        const result = await session.executeRead(tx => tx.run(cypherSeguro));
        
        const formatado = result.records.map(record => {
            let obj = {};
            record.keys.forEach(key => {
                const item = record.get(key);
                obj[key] = (item && item.properties) ? item.properties : item;
            });
            return obj;
        });

        return formatado;
    } catch (erro) {
        console.error("❌ Falha na execução da Cypher:", erro.message);
        // Oculta detalhes do banco por segurança corporativa
        throw new Error("Erro no processamento da malha de dados ou bloqueio de segurança ativado.");
    } finally {
        await session.close();
    }
}

module.exports = { executarQuery };