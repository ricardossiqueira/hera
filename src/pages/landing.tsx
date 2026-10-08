import { lazy, Suspense, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { HeraMark } from "@/components/hera-mark";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircuitBoard,
  Cpu,
  EthernetPort,
  Gauge,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Monitor,
  Network,
  Radio,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Terminal,
  Thermometer,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import "./landing.css";

const LandingParticles = lazy(() => import("@/components/landing-particles"));

// Shared motion language for the whole page: one easing, one spring, small
// offsets. Reveals fade+rise into view; groups stagger their children.
const EASE = [0.2, 0.7, 0.2, 1] as const;
const lift = { type: "spring", stiffness: 320, damping: 26 } as const;

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const group: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const revealTags = { div: motion.div, section: motion.section } as const;

/**
 * Reveal-on-scroll (or on-mount) wrapper. Honors reduced motion by rendering
 * its content statically, so nothing animates when the user opts out.
 */
function Reveal({
  as = "div",
  stagger = false,
  mount = false,
  className,
  id,
  children,
}: {
  as?: keyof typeof revealTags;
  stagger?: boolean;
  mount?: boolean;
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className} id={id}>
        {children}
      </Tag>
    );
  }
  const M = revealTags[as];
  return (
    <M
      className={className}
      id={id}
      variants={stagger ? group : item}
      initial="hidden"
      {...(mount
        ? { animate: "visible" }
        : { whileInView: "visible", viewport: { once: true, amount: 0.15 } })}
    >
      {children}
    </M>
  );
}

const features = [
  {
    id: "overview",
    title: "Enxergue o todo.",
    subtitle: "Cada sinal, no seu contexto.",
    description:
      "Saúde do gateway, telemetria e estado dos dispositivos. Uma visão clara para entender o que está acontecendo na sua rede.",
    icon: LayoutDashboard,
  },
  {
    id: "discovery",
    title: "Encontre seus dispositivos.",
    subtitle: "Da descoberta à conexão.",
    description:
      "Veja os dispositivos anunciados na rede, inspecione suas capacidades e acompanhe o registro no gateway.",
    icon: Radar,
  },
  {
    id: "automations",
    title: "Conecte eventos a ações.",
    subtitle: "Sua lógica ganha forma.",
    description:
      "Combine eventos, condições e comandos em um canvas visual. Entenda o caminho de cada automação, do início ao fim.",
    icon: Workflow,
  },
  {
    id: "telemetry",
    title: "Acompanhe cada detalhe.",
    subtitle: "Mais contexto para agir.",
    description:
      "Consulte CPU, memória e temperatura do Orange Pi pelo Theia e explore a telemetria publicada pelos seus dispositivos.",
    icon: Activity,
  },
] as const;
type PreviewKind = (typeof features)[number]["id"];

function Brand() {
  return (
    <span className="landing-brand">
      <HeraMark />
      hera<span className="landing-brand-period">.</span>
    </span>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <span className="preview-status">
      <span />
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: typeof Cpu;
}) {
  return (
    <div className="preview-metric">
      <span>
        <Icon size={13} />
        {label}
      </span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      <div className="preview-meter">
        <i
          style={{
            width:
              label === "CPU" ? "24%" : label === "Memória" ? "42%" : "56%",
          }}
        />
      </div>
    </div>
  );
}

function TelemetryChart() {
  return (
    <div className="preview-chart">
      <div className="preview-chart-title">
        <span>Atividade do sistema</span>
        <span>Últimos 60 minutos</span>
      </div>
      <svg
        viewBox="0 0 600 112"
        role="img"
        aria-label="Gráfico ilustrativo de atividade do sistema"
      >
        <path className="chart-grid" d="M0 20H600M0 55H600M0 90H600" />
        <path
          className="chart-area"
          d="M0 85L20 83L40 87L60 78L80 81L100 70L120 76L140 69L160 72L180 52L200 61L220 57L240 70L260 65L280 71L300 59L320 64L340 41L360 52L380 45L400 55L420 49L440 28L460 40L480 34L500 49L520 39L540 44L560 23L580 31L600 20V112H0Z"
        />
        <path
          className="chart-line"
          d="M0 85L20 83L40 87L60 78L80 81L100 70L120 76L140 69L160 72L180 52L200 61L220 57L240 70L260 65L280 71L300 59L320 64L340 41L360 52L380 45L400 55L420 49L440 28L460 40L480 34L500 49L520 39L540 44L560 23L580 31L600 20"
        />
      </svg>
      <div className="preview-chart-axis">
        <span>09:00</span>
        <span>09:15</span>
        <span>09:30</span>
        <span>09:45</span>
        <span>10:00</span>
      </div>
    </div>
  );
}

const previewDevices = [
  { name: "Orange Pi", detail: "Monitoramento · Theia", icon: CircuitBoard },
  { name: "ESP32-C3", detail: "Controlador · LED", icon: Cpu },
  { name: "Display CYD", detail: "Display · Telemetria", icon: Monitor },
];

function DeviceRows({ discovery = false }: { discovery?: boolean }) {
  return (
    <div className="preview-devices">
      <div className="preview-table-heading">
        <span>Dispositivo</span>
        <span>{discovery ? "Descoberta" : "Estado no gateway"}</span>
      </div>
      {previewDevices.map(({ name, detail, icon: Icon }) => (
        <div className="preview-device" key={name}>
          <span className="preview-device-icon">
            <Icon size={17} />
          </span>
          <div>
            <strong>{name}</strong>
            <span>{detail}</span>
          </div>
          <span className="preview-device-state">
            {discovery ? "Disponível" : "Ativo"}
            <ChevronRight size={12} />
          </span>
        </div>
      ))}
    </div>
  );
}

function AutomationPreview() {
  return (
    <div className="preview-flow">
      <div className="preview-flow-caption">
        <span>Orange Pi → Display CYD</span>
        <Status>Habilitada</Status>
      </div>
      <div className="preview-flow-nodes">
        <div className="preview-flow-node">
          <span>
            <Radio size={14} />
            EVENTO
          </span>
          <strong>Telemetria recebida</strong>
          <small>Orange Pi · telemetry</small>
          <i />
        </div>
        <div className="preview-flow-connector" />
        <div className="preview-flow-node">
          <span>
            <Layers size={14} />
            CONDIÇÃO
          </span>
          <strong>Em cada atualização</strong>
          <small>Continuar o fluxo</small>
          <i />
        </div>
        <div className="preview-flow-connector" />
        <div className="preview-flow-node">
          <span>
            <Zap size={14} />
            AÇÃO
          </span>
          <strong>Atualizar display</strong>
          <small>CYD · comando</small>
        </div>
      </div>
      <p>
        <Check size={12} /> Um caminho claro entre o que acontece e o que fazer.
      </p>
    </div>
  );
}

/** Presentation-only sample data. Never mounts gateway hooks or sends commands. */
function ProductPreview({
  kind = "overview",
  compact = false,
}: {
  kind?: PreviewKind;
  compact?: boolean;
}) {
  const title = {
    overview: "Visão geral",
    discovery: "Discovery",
    automations: "Automações",
    telemetry: "Saúde do sistema",
  }[kind];
  return (
    <div
      className={`product-preview${compact ? " product-preview-compact" : ""}`}
    >
      <div className="preview-topbar">
        <span className="preview-wordmark">
          <HeraMark small />
          hera.
        </span>
        <span className="preview-breadcrumb">
          Workspace <ChevronRight size={10} /> Meu gateway
        </span>
        <span className="preview-demo">Demonstração</span>
      </div>
      <div className="preview-layout">
        <div className="preview-sidebar">
          <span className="preview-sidebar-label">WORKSPACE</span>
          {features.map(({ id, icon: Icon }) => (
            <div
              key={id}
              className={`preview-nav-item${kind === id ? " is-current" : ""}`}
            >
              <Icon size={14} />
              <span>
                {
                  {
                    overview: "Visão geral",
                    discovery: "Discovery",
                    automations: "Automações",
                    telemetry: "Telemetria",
                  }[id]
                }
              </span>
            </div>
          ))}
          <div className="preview-nav-item">
            <Cpu size={14} />
            <span>Dispositivos</span>
          </div>
          <div className="preview-sidebar-bottom">
            <div className="preview-nav-item">
              <Settings size={14} />
              Configurações
            </div>
            <div className="preview-gateway">
              <span className="preview-avatar">H</span>
              <span>
                Meu gateway<small>Rede local</small>
              </span>
              <ChevronRight size={12} />
            </div>
          </div>
        </div>
        <div className="preview-main">
          <div className="preview-page-heading">
            <div>
              <span className="preview-eyebrow">MEU GATEWAY</span>
              <h3>{title}</h3>
            </div>
            <span className="preview-refresh">
              <Activity size={12} />
              Atualização a cada 10s
            </span>
          </div>
          {kind === "overview" && (
            <>
              <div className="preview-summary">
                <div>
                  <span>Registrados</span>
                  <strong>03</strong>
                  <small>Dispositivos no gateway</small>
                </div>
                <div>
                  <span>Ativos</span>
                  <strong>03</strong>
                  <small>Prontos para operar</small>
                </div>
                <div>
                  <span>Precisam de atenção</span>
                  <strong>00</strong>
                  <small>Nenhuma pendência</small>
                </div>
              </div>
              <div className="preview-section-label">
                <span>
                  <CircuitBoard size={13} />
                  Orange Pi
                </span>
                <span>Theia</span>
              </div>
              <div className="preview-metrics">
                <Metric label="CPU" value="12,5" unit="%" icon={Cpu} />
                <Metric label="Memória" value="42" unit="%" icon={Layers} />
                <Metric
                  label="Temperatura"
                  value="46"
                  unit="°C"
                  icon={Thermometer}
                />
              </div>
              <DeviceRows />
            </>
          )}
          {kind === "discovery" && (
            <>
              <p className="preview-description">
                Encontre e conheça os dispositivos da sua rede.
              </p>
              <div className="preview-search">
                <Search size={14} />
                Dispositivos anunciados na rede<span>3 encontrados</span>
              </div>
              <DeviceRows discovery />
              <div className="preview-info">
                <Radar size={20} />
                <div>
                  <strong>Da rede para o seu workspace</strong>
                  <p>
                    Inspecione o dispositivo e suas capacidades antes de
                    registrar.
                  </p>
                </div>
              </div>
            </>
          )}
          {kind === "automations" && (
            <>
              <p className="preview-description">
                Eventos, condições e ações. Tudo conectado.
              </p>
              <AutomationPreview />
            </>
          )}
          {kind === "telemetry" && (
            <>
              <p className="preview-description">
                Orange Pi · Monitoramento pelo Theia
              </p>
              <div className="preview-metrics">
                <Metric label="CPU" value="12,5" unit="%" icon={Cpu} />
                <Metric label="Memória" value="42" unit="%" icon={Layers} />
                <Metric
                  label="Temperatura"
                  value="46"
                  unit="°C"
                  icon={Thermometer}
                />
              </div>
              <TelemetryChart />
              <div className="preview-footnote">
                Visualização ilustrativa de telemetria
              </div>
            </>
          )}
        </div>
        {!compact && (
          <div className="preview-aside">
            <span className="preview-sidebar-label">SAÚDE DO GATEWAY</span>
            <div className="preview-runtime">
              <span>API</span>
              <Status>Online</Status>
            </div>
            <div className="preview-runtime">
              <span>MQTT</span>
              <Status>Conectado</Status>
            </div>
            <div className="preview-aside-divider" />
            <span className="preview-sidebar-label">MENSAGENS</span>
            <strong className="preview-message-count">1.284</strong>
            <span className="preview-aside-note">aceitas pelo gateway</span>
            <div className="preview-mini-bars" aria-hidden="true">
              {[
                20, 32, 26, 45, 37, 50, 32, 43, 58, 48, 63, 53, 70, 61, 76, 67,
                80, 73,
              ].map((height, i) => (
                <i key={i} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="preview-aside-divider" />
            <span className="preview-sidebar-label">SEU ECOSSISTEMA</span>
            {previewDevices.map(({ name, icon: Icon }) => (
              <div className="preview-ecosystem" key={name}>
                <Icon size={13} />
                {name}
                <span />
              </div>
            ))}
            <div className="preview-local">
              <ShieldCheck size={17} />
              <span>
                Sua operação.
                <br />
                Na sua rede.
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="preview-bottom">
        <span>
          <span className="preview-status-dot" />
          Hera · workspace local
        </span>
        <span>Dados ilustrativos</span>
      </div>
    </div>
  );
}

const ecosystem = [
  { label: "Orange Pi", icon: CircuitBoard },
  { label: "ESP32", icon: Cpu },
  { label: "Displays", icon: Monitor },
  { label: "Sensores", icon: Gauge },
  { label: "Iluminação", icon: Lightbulb },
  { label: "MQTT", icon: Radio },
];

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<PreviewKind>("overview");
  const feature = features.find(({ id }) => id === activeFeature)!;
  const closeMenu = () => setMenuOpen(false);

  return (
    <MotionConfig reducedMotion="user">
    <div className="hera-landing" id="inicio">
      <Suspense fallback={null}>
        <LandingParticles />
      </Suspense>
      <a className="landing-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <a href="#inicio" aria-label="Hera — início" onClick={closeMenu}>
            <Brand />
          </a>
          <nav
            className={menuOpen ? "landing-nav is-open" : "landing-nav"}
            id="landing-navigation"
            aria-label="Navegação principal"
          >
            <a href="#visao-geral" onClick={closeMenu}>
              Visão geral
            </a>
            <a href="#recursos" onClick={closeMenu}>
              Recursos
            </a>
            <a href="#como-funciona" onClick={closeMenu}>
              Como funciona
            </a>
            <a href="#perguntas" onClick={closeMenu}>
              Perguntas
            </a>
          </nav>
          <div className="landing-header-actions">
            <Link
              className="landing-button landing-button-small"
              to="/overview"
            >
              Abrir Hera <ArrowUpRight size={14} />
            </Link>
            <button
              className="landing-menu-toggle"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls="landing-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="landing-hero landing-container" id="visao-geral">
          <Reveal className="landing-hero-copy" stagger mount>
            <motion.span className="landing-eyebrow" variants={item}>
              <span /> SEU ECOSSISTEMA, EM SINTONIA
            </motion.span>
            <motion.h1 variants={item}>
              Seus dispositivos.
              <br />
              <span>Uma só visão.</span>
            </motion.h1>
            <motion.p variants={item}>
              Conecte os pontos da sua operação.
              <br className="desktop-break" /> Monitore dispositivos, acompanhe
              sinais e crie
              <br className="desktop-break" /> automações em um único lugar.
            </motion.p>
            <motion.div className="landing-actions" variants={item}>
              <Link className="landing-button" to="/overview">
                Conhecer a Hera <ArrowUpRight size={15} />
              </Link>
              <a
                className="landing-button landing-button-secondary"
                href="#recursos"
              >
                Explorar recursos <ArrowDown size={14} />
              </a>
            </motion.div>
            <motion.span className="landing-hero-note" variants={item}>
              Do primeiro sinal à próxima ação.
            </motion.span>
          </Reveal>
          <Reveal className="landing-hero-preview" mount>
            <ProductPreview />
          </Reveal>
          <div className="landing-preview-caption">
            <span>MENOS RUÍDO. MAIS CONTEXTO.</span>
            <span>
              Uma prévia do seu próximo workspace <ArrowDown size={12} />
            </span>
          </div>
        </section>

        <section
          className="landing-ecosystem landing-container"
          aria-labelledby="ecosystem-heading"
        >
          <Reveal className="landing-section-heading">
            <span className="landing-eyebrow">CONEXÕES QUE FAZEM SENTIDO</span>
            <h2 id="ecosystem-heading">
              Diferentes dispositivos.
              <br />
              <span>O mesmo lugar.</span>
            </h2>
            <p>
              Da telemetria do Orange Pi aos comandos do ESP32.
              <br className="desktop-break" /> Seu ecossistema conectado pelo
              gateway.
            </p>
          </Reveal>
          <Reveal className="landing-ecosystem-grid" stagger>
            {ecosystem.map(({ label, icon: Icon }) => (
              <motion.div
                key={label}
                variants={item}
                whileHover={{ y: -4 }}
                transition={lift}
              >
                <Icon size={26} strokeWidth={1.3} />
                <span>{label}</span>
              </motion.div>
            ))}
          </Reveal>
          <p className="landing-ecosystem-note">
            As capacidades disponíveis dependem de cada dispositivo conectado.
          </p>
        </section>

        <section className="landing-features" id="recursos">
          <div className="landing-container">
            <Reveal className="landing-section-heading">
              <span className="landing-eyebrow">DA VISÃO GERAL AO DETALHE</span>
              <h2>
                Entenda o que acontece.
                <br />
                <span>Decida o próximo passo.</span>
              </h2>
              <p>
                Uma interface para acompanhar, descobrir e conectar.
                <br className="desktop-break" /> Cada parte da sua operação no
                seu contexto.
              </p>
            </Reveal>
            <Reveal className="landing-feature-layout">
              <div
                className="landing-feature-selectors"
                aria-label="Recursos da Hera"
              >
                {features.map(({ id, title, subtitle, icon: Icon }, index) => (
                  <motion.button
                    key={id}
                    id={`feature-${id}`}
                    className={
                      activeFeature === id
                        ? "landing-feature-button is-active"
                        : "landing-feature-button"
                    }
                    aria-pressed={activeFeature === id}
                    aria-controls="feature-preview"
                    onClick={() => setActiveFeature(id)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.99 }}
                    transition={lift}
                  >
                    <span className="landing-feature-number">0{index + 1}</span>
                    <span>
                      <strong>{title}</strong>
                      <small>{subtitle}</small>
                    </span>
                    <Icon size={16} />
                  </motion.button>
                ))}
                <span className="landing-feature-hint">
                  Explore cada perspectiva <ArrowRight size={13} />
                </span>
              </div>
              <div
                id="feature-preview"
                role="region"
                aria-labelledby={`feature-${activeFeature}`}
              >
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease: EASE }}
                >
                  <ProductPreview kind={activeFeature} compact />
                </motion.div>
                <div className="landing-feature-description" aria-live="polite">
                  <p>{feature.description}</p>
                  <Link
                    to="/overview"
                    aria-label={`Explorar na Hera: ${feature.title}`}
                  >
                    <ArrowUpRight size={20} />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="landing-how landing-container" id="como-funciona">
          <Reveal className="landing-section-heading">
            <span className="landing-eyebrow">UM COMEÇO SIMPLES</span>
            <h2>
              Da conexão à ação.
              <br />
              <span>Sem perder o fio.</span>
            </h2>
          </Reveal>
          <Reveal className="landing-steps" stagger>
            {[
              {
                title: "Acesse seu gateway",
                text: "Abra a Hera e entre com as credenciais do seu gateway para acessar a operação.",
                icon: EthernetPort,
              },
              {
                title: "Conheça sua rede",
                text: "Encontre dispositivos no Discovery, inspecione suas capacidades e faça o registro.",
                icon: Radar,
              },
              {
                title: "Dê vida às conexões",
                text: "Acompanhe a telemetria, envie comandos e crie automações entre dispositivos.",
                icon: Workflow,
              },
            ].map(({ title, text, icon: Icon }, i) => (
              <motion.article
                key={title}
                variants={item}
                whileHover={{ y: -4 }}
                transition={lift}
              >
                <div className="landing-step-top">
                  <span>0{i + 1}</span>
                  <Icon size={23} strokeWidth={1.3} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.article>
            ))}
          </Reveal>
        </section>

        <section
          className="landing-principles landing-container"
          aria-labelledby="principles-heading"
        >
          <Reveal>
            <span className="landing-eyebrow">FEITA PARA A SUA OPERAÇÃO</span>
            <h2 id="principles-heading">
              Tudo conectado.
              <br />
              <span>Você no controle.</span>
            </h2>
            <p>
              Mais clareza para cuidar do que está
              <br className="desktop-break" /> acontecendo do outro lado da
              tela.
            </p>
          </Reveal>
          <Reveal className="landing-principle-list" stagger>
            {[
              {
                title: "Perto dos seus dispositivos",
                text: "Uma interface conectada ao seu gateway, na sua rede.",
                icon: Network,
              },
              {
                title: "Informação no contexto",
                text: "Status, capacidades e telemetria reunidos para orientar cada ação.",
                icon: Activity,
              },
              {
                title: "Do seu jeito",
                text: "Automações visuais para conectar os eventos e comandos da sua operação.",
                icon: Terminal,
              },
            ].map(({ title, text, icon: Icon }) => (
              <motion.article key={title} variants={item}>
                <Icon size={20} strokeWidth={1.4} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </motion.article>
            ))}
          </Reveal>
        </section>

        <section className="landing-faq landing-container" id="perguntas">
          <Reveal className="landing-section-heading">
            <span className="landing-eyebrow">ANTES DE COMEÇAR</span>
            <h2>
              Algumas respostas.
              <br />
              <span>Mais clareza.</span>
            </h2>
          </Reveal>
          <Reveal className="landing-faq-list" stagger>
            {[
              {
                question: "O que é a Hera?",
                answer:
                  "A Hera é o painel de operação do seu gateway IoT. Ela reúne dispositivos, descoberta na rede, telemetria, comandos e automações em uma única interface.",
              },
              {
                question: "O que preciso para acessar?",
                answer:
                  "Você precisa de um gateway configurado e acessível, com a API habilitada, e de suas credenciais de acesso. O endereço do gateway é definido na configuração da instalação da Hera.",
              },
              {
                question: "Quais dispositivos posso conectar?",
                answer:
                  "Dispositivos compatíveis com o gateway e seu contrato de capacidades. O ecossistema inclui o monitoramento do Orange Pi pelo Theia, controladores ESP32 e displays CYD. Os comandos e a telemetria disponíveis variam conforme o dispositivo.",
              },
              {
                question: "Os dados desta página são da minha rede?",
                answer:
                  "Não. As prévias são ilustrativas e mostram a proposta visual da Hera. Os dados reais são consultados no painel, depois de entrar com as credenciais do seu gateway.",
              },
            ].map(({ question, answer }) => (
              <motion.details key={question} variants={item}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </motion.details>
            ))}
          </Reveal>
        </section>

        <Reveal as="section" className="landing-final landing-container">
          <HeraMark />
          <span className="landing-eyebrow">SEU PRÓXIMO PASSO</span>
          <h2>
            Seu ecossistema.
            <br />
            <span>Mais perto de você.</span>
          </h2>
          <p>Um lugar para ver, entender e conectar.</p>
          <Link to="/overview" className="landing-button">
            Abrir meu workspace <ArrowUpRight size={15} />
          </Link>
        </Reveal>
      </main>
      <footer className="landing-footer landing-container">
        <a href="#inicio" aria-label="Hera — voltar ao início">
          <Brand />
        </a>
        <span>Conecte os pontos.</span>
        <a href="#inicio">
          Voltar ao topo <ArrowUpRight size={13} />
        </a>
      </footer>
      {/* TODO: substituir pela atribuição e licença corretas do female_bust. */}
      <p className="landing-model-credit landing-container">
        Modelo 3D adaptado para pontos.
      </p>
    </div>
    </MotionConfig>
  );
}
