import { useState, useEffect } from 'react';
import { PawPrint, MapPin, Camera, Loader2, CheckCircle2, Pin, Heart, Upload, X } from 'lucide-react';

const SUPABASE_URL = 'https://uciuhzwgihehnvnsyzae.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CNQdiYi-KVo4O5R1rt5qTw_YqSp3Ftf';

const H = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function uploadFoto(file) {
  const path = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/fotos-pets/${path}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('Falha ao enviar a foto. Confira se o bucket "fotos-pets" existe e é público.');
  return `${SUPABASE_URL}/storage/v1/object/public/fotos-pets/${path}`;
}

function carregarImagemRedimensionada(src, maxDim = 800, qualidade = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height >= width && height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', qualidade).split(',')[1]);
    };
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem para comparação'));
    img.src = src;
  });
}

function arquivoParaBase64Reduzido(file, maxDim = 800, qualidade = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      carregarImagemRedimensionada(reader.result, maxDim, qualidade).then(resolve).catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function inserir(tabela, dados) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Falha ao salvar cadastro: ' + err);
  }
  const json = await res.json();
  return json[0];
}

async function buscar(tabela, params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?${query}`, { headers: H });
  if (!res.ok) throw new Error('Falha ao buscar dados');
  return res.json();
}

async function compararFotos(base64A, mimeA, descA, base64B, mimeB, descB) {
  const response = await fetch('/api/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64A, mimeA, descA, base64B, mimeB, descB }),
  });
  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || 'Falha ao comparar fotos com a IA');
  }
  return response.json();
}

const ESPECIES = ['Cachorro', 'Gato', 'Passarinho', 'Outro'];

function CampoTexto({ label, ...props }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ fontFamily: 'Work Sans', fontSize: 13, fontWeight: 600, color: '#3A2E22' }}>{label}</span>
      <input
        {...props}
        style={{
          width: '100%',
          marginTop: 6,
          padding: '10px 12px',
          border: '1.5px solid #D8C9A8',
          borderRadius: 6,
          fontFamily: 'Work Sans',
          fontSize: 14,
          color: '#3A2E22',
          background: '#FFFDF8',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

function CampoSelect({ label, options, ...props }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ fontFamily: 'Work Sans', fontSize: 13, fontWeight: 600, color: '#3A2E22' }}>{label}</span>
      <select
        {...props}
        style={{
          width: '100%',
          marginTop: 6,
          padding: '10px 12px',
          border: '1.5px solid #D8C9A8',
          borderRadius: 6,
          fontFamily: 'Work Sans',
          fontSize: 14,
          color: '#3A2E22',
          background: '#FFFDF8',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function CampoFoto({ preview, onChange }) {
  return (
    <label style={{ display: 'block', marginBottom: 16, cursor: 'pointer' }}>
      <span style={{ fontFamily: 'Work Sans', fontSize: 13, fontWeight: 600, color: '#3A2E22' }}>Foto do animal</span>
      <div
        style={{
          marginTop: 6,
          border: '2px dashed #C9A876',
          borderRadius: 8,
          minHeight: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFDF8',
          overflow: 'hidden',
        }}
      >
        {preview ? (
          <img src={preview} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#A08A63', fontFamily: 'Work Sans', fontSize: 13, padding: 20 }}>
            <Camera size={28} style={{ margin: '0 auto 6px' }} />
            Toque para escolher uma foto
          </div>
        )}
      </div>
      <input type="file" accept="image/*" onChange={onChange} style={{ display: 'none' }} />
    </label>
  );
}

function Botao({ children, disabled, style, ...props }) {
  return (
    <button
      disabled={disabled}
      {...props}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: disabled ? '#C9A876' : '#B34A3C',
        color: '#FFFDF8',
        border: 'none',
        borderRadius: 6,
        fontFamily: 'Work Sans',
        fontWeight: 600,
        fontSize: 15,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function Flyer({ rotate, children }) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#FBF6EC',
        borderRadius: 4,
        padding: '28px 20px 20px',
        boxShadow: '0 8px 16px rgba(58,46,34,0.25)',
        transform: `rotate(${rotate}deg)`,
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <Pin
        size={26}
        color="#B34A3C"
        style={{
          position: 'absolute',
          top: -14,
          left: '50%',
          transform: 'translateX(-50%) rotate(-15deg)',
          filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))',
        }}
      />
      {children}
    </div>
  );
}

function FormularioPerdido({ onSucesso }) {
  const [form, setForm] = useState({ nome_tutor: '', contato: '', especie: 'Cachorro', raca: '', cor: '', tamanho: '', caracteristicas: '', localizacao_texto: '' });
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const escolherFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const enviar = async () => {
    setErro('');
    if (!foto) { setErro('Escolha uma foto do seu pet.'); return; }
    if (!form.localizacao_texto) { setErro('Informe onde o pet foi visto pela última vez.'); return; }
    setEnviando(true);
    try {
      const foto_url = await uploadFoto(foto);
      await inserir('pets_perdidos', { ...form, foto_url, data_perda: new Date().toISOString().slice(0, 10) });
      setForm({ nome_tutor: '', contato: '', especie: 'Cachorro', raca: '', cor: '', tamanho: '', caracteristicas: '', localizacao_texto: '' });
      setFoto(null);
      setPreview(null);
      onSucesso();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Flyer rotate={-1.5}>
      <h2 style={{ fontFamily: 'Caveat', fontSize: 34, color: '#3A2E22', margin: '0 0 4px', textAlign: 'center' }}>
        Perdi meu bichinho 💔
      </h2>
      <p style={{ fontFamily: 'Work Sans', fontSize: 13, color: '#7A6A50', textAlign: 'center', marginTop: 0, marginBottom: 18 }}>
        Preencha os dados para que quem encontrar seu pet possa te achar
      </p>
      <CampoFoto preview={preview} onChange={escolherFoto} />
      <CampoSelect label="Espécie" options={ESPECIES} value={form.especie} onChange={set('especie')} />
      <CampoTexto label="Seu nome" value={form.nome_tutor} onChange={set('nome_tutor')} placeholder="Ex: Ana Souza" />
      <CampoTexto label="Contato (telefone/whatsapp)" value={form.contato} onChange={set('contato')} placeholder="Ex: (11) 99999-9999" />
      <CampoTexto label="Raça" value={form.raca} onChange={set('raca')} placeholder="Ex: SRD, Poodle..." />
      <CampoTexto label="Cor" value={form.cor} onChange={set('cor')} placeholder="Ex: Caramelo com branco" />
      <CampoTexto label="Tamanho" value={form.tamanho} onChange={set('tamanho')} placeholder="Ex: Pequeno, médio, grande" />
      <CampoTexto label="Características marcantes" value={form.caracteristicas} onChange={set('caracteristicas')} placeholder="Ex: usa coleira azul, manca da pata" />
      <CampoTexto label="Onde foi visto pela última vez" value={form.localizacao_texto} onChange={set('localizacao_texto')} placeholder="Ex: Praça da Rua X, bairro Y" />
      {erro && <p style={{ color: '#B34A3C', fontFamily: 'Work Sans', fontSize: 13 }}>{erro}</p>}
      <Botao onClick={enviar} disabled={enviando}>
        {enviando ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        {enviando ? 'Enviando...' : 'Publicar cartaz de procura-se'}
      </Botao>
    </Flyer>
  );
}

function FormularioEncontrado({ onSucesso }) {
  const [form, setForm] = useState({ nome_quem_achou: '', contato: '', especie: 'Cachorro', cor: '', tamanho: '', caracteristicas: '', localizacao_texto: '' });
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultados, setResultados] = useState(null);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const escolherFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const enviar = async () => {
    setErro('');
    setResultados(null);
    if (!foto) { setErro('Escolha uma foto do animal encontrado.'); return; }
    if (!form.localizacao_texto) { setErro('Informe onde o animal foi encontrado.'); return; }
    setEnviando(true);
    try {
      const foto_url = await uploadFoto(foto);
      const registro = await inserir('pets_encontrados', { ...form, foto_url, data_encontrado: new Date().toISOString().slice(0, 10) });

      setEnviando(false);
      setAnalisando(true);

      const candidatos = await buscar('pets_perdidos', { especie: `eq.${form.especie}`, status: 'eq.procurando', select: '*' });
      const base64Encontrado = await arquivoParaBase64Reduzido(foto);
      const mimeEncontrado = 'image/jpeg';

      const comparacoes = [];
      for (const candidato of candidatos.slice(0, 8)) {
        try {
          const base64Candidato = await carregarImagemRedimensionada(candidato.foto_url);
          const descA = `${candidato.especie}, raça ${candidato.raca || 'não informada'}, cor ${candidato.cor || '?'}, tamanho ${candidato.tamanho || '?'}, características: ${candidato.caracteristicas || 'nenhuma'}, visto em: ${candidato.localizacao_texto}`;
          const descB = `${form.especie}, cor ${form.cor || '?'}, tamanho ${form.tamanho || '?'}, características: ${form.caracteristicas || 'nenhuma'}, encontrado em: ${form.localizacao_texto}`;
          const resultado = await compararFotos(base64Candidato, 'image/jpeg', descA, base64Encontrado, mimeEncontrado, descB);
          comparacoes.push({ candidato, resultado });
          if (resultado.pontuacao >= 60) {
            await inserir('matches', {
              pet_perdido_id: candidato.id,
              pet_encontrado_id: registro.id,
              score_similaridade: resultado.pontuacao,
            });
          }
        } catch (erroComparacao) {
          comparacoes.push({ candidato, resultado: { pontuacao: 0, motivo: 'Erro ao comparar: ' + erroComparacao.message } });
        }
      }

      comparacoes.sort((a, b) => b.resultado.pontuacao - a.resultado.pontuacao);
      setResultados(comparacoes);
      setForm({ nome_quem_achou: '', contato: '', especie: 'Cachorro', cor: '', tamanho: '', caracteristicas: '', localizacao_texto: '' });
      setFoto(null);
      setPreview(null);
      onSucesso();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
      setAnalisando(false);
    }
  };

  return (
    <div>
      <Flyer rotate={1.2}>
        <h2 style={{ fontFamily: 'Caveat', fontSize: 34, color: '#3A2E22', margin: '0 0 4px', textAlign: 'center' }}>
          Encontrei um bichinho 🐾
        </h2>
        <p style={{ fontFamily: 'Work Sans', fontSize: 13, color: '#7A6A50', textAlign: 'center', marginTop: 0, marginBottom: 18 }}>
          Suba uma foto e a IA procura por possíveis tutores
        </p>
        <CampoFoto preview={preview} onChange={escolherFoto} />
        <CampoSelect label="Espécie" options={ESPECIES} value={form.especie} onChange={set('especie')} />
        <CampoTexto label="Seu nome" value={form.nome_quem_achou} onChange={set('nome_quem_achou')} placeholder="Ex: Carlos Lima" />
        <CampoTexto label="Contato (telefone/whatsapp)" value={form.contato} onChange={set('contato')} placeholder="Ex: (11) 99999-9999" />
        <CampoTexto label="Cor" value={form.cor} onChange={set('cor')} placeholder="Ex: Preto e branco" />
        <CampoTexto label="Tamanho" value={form.tamanho} onChange={set('tamanho')} placeholder="Ex: Pequeno, médio, grande" />
        <CampoTexto label="Características marcantes" value={form.caracteristicas} onChange={set('caracteristicas')} placeholder="Ex: sem coleira, muito dócil" />
        <CampoTexto label="Onde foi encontrado" value={form.localizacao_texto} onChange={set('localizacao_texto')} placeholder="Ex: Av. Principal, bairro Z" />
        {erro && <p style={{ color: '#B34A3C', fontFamily: 'Work Sans', fontSize: 13 }}>{erro}</p>}
        <Botao onClick={enviar} disabled={enviando || analisando}>
          {(enviando || analisando) ? <Loader2 size={18} className="animate-spin" /> : <PawPrint size={18} />}
          {enviando ? 'Salvando...' : analisando ? 'IA analisando fotos...' : 'Publicar e buscar por tutores'}
        </Botao>
      </Flyer>

      {resultados && (
        <div style={{ maxWidth: 420, margin: '28px auto 0' }}>
          <h3 style={{ fontFamily: 'Caveat', fontSize: 26, color: '#3A2E22', textAlign: 'center' }}>Resultado da análise</h3>
          {resultados.length === 0 && (
            <p style={{ fontFamily: 'Work Sans', fontSize: 13, color: '#7A6A50', textAlign: 'center' }}>
              Nenhum pet perdido cadastrado dessa espécie ainda para comparar.
            </p>
          )}
          {resultados.map(({ candidato, resultado }, i) => (
            <div
              key={i}
              style={{
                background: '#FFFDF8',
                border: `1.5px solid ${resultado.pontuacao >= 60 ? '#5C7A5E' : '#D8C9A8'}`,
                borderRadius: 8,
                padding: 14,
                marginBottom: 10,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <img src={candidato.foto_url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
              <div style={{ flex: 1, fontFamily: 'Work Sans' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3A2E22', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {resultado.pontuacao >= 60 ? <CheckCircle2 size={16} color="#5C7A5E" /> : <X size={16} color="#A08A63" />}
                  {resultado.pontuacao}% de chance de ser o mesmo animal
                </div>
                <div style={{ fontSize: 12, color: '#7A6A50', marginTop: 2 }}>{resultado.motivo}</div>
                {resultado.pontuacao >= 60 && (
                  <div style={{ fontSize: 12, color: '#5C7A5E', marginTop: 4 }}>
                    Contato do tutor: {candidato.contato}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Feed({ atualizar }) {
  const [perdidos, setPerdidos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    buscar('pets_perdidos', { select: '*', status: 'eq.procurando', order: 'criado_em.desc' })
      .then(setPerdidos)
      .finally(() => setCarregando(false));
  }, [atualizar]);

  if (carregando) {
    return <p style={{ textAlign: 'center', fontFamily: 'Work Sans', color: '#7A6A50' }}>Carregando cartazes...</p>;
  }

  if (perdidos.length === 0) {
    return <p style={{ textAlign: 'center', fontFamily: 'Work Sans', color: '#7A6A50' }}>Nenhum pet perdido cadastrado ainda.</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 32, maxWidth: 900, margin: '0 auto', padding: '10px 0' }}>
      {perdidos.map((p, i) => (
        <Flyer key={p.id} rotate={i % 2 === 0 ? -1.5 : 1.5}>
          <img src={p.foto_url} alt={p.especie} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 4, marginBottom: 10 }} />
          <h3 style={{ fontFamily: 'Caveat', fontSize: 26, color: '#3A2E22', margin: '0 0 4px', textAlign: 'center' }}>
            Procura-se {p.especie.toLowerCase()}
          </h3>
          <p style={{ fontFamily: 'Work Sans', fontSize: 12.5, color: '#5A4A38', lineHeight: 1.5, margin: '0 0 8px' }}>
            <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
            {p.localizacao_texto}<br />
            {p.cor && <>Cor: {p.cor}<br /></>}
            {p.caracteristicas}
          </p>
          <div style={{ borderTop: '1px dashed #C9A876', paddingTop: 8, fontFamily: 'Work Sans', fontSize: 12, color: '#7A6A50', textAlign: 'center' }}>
            Contato: {p.contato}
          </div>
        </Flyer>
      ))}
    </div>
  );
}

export default function App() {
  const [aba, setAba] = useState('feed');
  const [atualizar, setAtualizar] = useState(0);

  const abas = [
    { id: 'feed', label: 'Mural' },
    { id: 'perdi', label: 'Perdi meu pet' },
    { id: 'achei', label: 'Encontrei um pet' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#C9A876',
        backgroundImage:
          'radial-gradient(rgba(160,130,80,0.35) 1.5px, transparent 1.5px), radial-gradient(rgba(160,130,80,0.25) 1.5px, transparent 1.5px)',
        backgroundSize: '18px 18px, 26px 26px',
        backgroundPosition: '0 0, 9px 13px',
        padding: '32px 16px 60px',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Work+Sans:wght@400;500;600&display=swap');
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{ fontFamily: 'Caveat', fontWeight: 700, fontSize: 56, color: '#3A2E22', margin: 0, textShadow: '1px 1px 0 rgba(255,255,255,0.3)' }}>
          Cadê Você?
        </h1>
        <p style={{ fontFamily: 'Work Sans', fontSize: 13, color: '#5A4A38', marginTop: -6 }}>
          O mural da vizinhança para reencontrar pets perdidos
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              fontFamily: 'Work Sans',
              fontWeight: 600,
              fontSize: 13,
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              background: aba === a.id ? '#3A2E22' : 'rgba(255,253,248,0.8)',
              color: aba === a.id ? '#FBF6EC' : '#3A2E22',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'feed' && <Feed atualizar={atualizar} />}
      {aba === 'perdi' && <FormularioPerdido onSucesso={() => { setAtualizar((n) => n + 1); setAba('feed'); }} />}
      {aba === 'achei' && <FormularioEncontrado onSucesso={() => setAtualizar((n) => n + 1)} />}

      <p style={{ textAlign: 'center', fontFamily: 'Work Sans', fontSize: 11, color: '#5A4A38', marginTop: 40, opacity: 0.7 }}>
        <Heart size={11} style={{ display: 'inline', marginRight: 4 }} />
        Protótipo — dados salvos de verdade no seu banco Supabase
      </p>
    </div>
  );
}
