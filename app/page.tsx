import Link from "next/link";
import FadeIn from "./fade-in";
import NeuronHero from "@/components/NeuronHero";

export default function Home() {
  return (
    <>
      <FadeIn />
      {/* HERO */}
      <section id="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">Available for opportunities in Canada</div>
            <h1>Hyojin <em>Kim</em></h1>
            <p className="hero-desc">
              Software Engineer &amp; IT Specialist with 5+ years bridging infrastructure, automation, and web development. From network uptime at mission-critical ports to Shopify storefronts — I build things that work.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" href="/contact">Get in touch</Link>
              <a className="btn btn-outline" href="#experience">View experience</a>
            </div>
            <div className="hero-stats">
              <div><span className="stat-num">5+</span><span className="stat-label">Years experience</span></div>
              <div><span className="stat-num">50%</span><span className="stat-label">Reporting time saved</span></div>
              <div><span className="stat-num">99.9%</span><span className="stat-label">Network uptime</span></div>
              <div><span className="stat-num">80+</span><span className="stat-label">Issues resolved</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-stage">
              <div className="hero-neuron-backdrop"><NeuronHero /></div>
              <div className="hero-video-frame">
                <video autoPlay muted loop playsInline aria-hidden="true" src="/videos/profile-hero.mp4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SKILLS */}
      <section id="skills">
        <div className="home-section-head fade-in" style={{paddingTop: '5.5rem'}}>
          <div className="eyebrow">Capabilities</div>
          <h2>What I work with</h2>
          <p className="section-desc">A full range from network infrastructure to front-end development.</p>
        </div>
        <div className="cell-grid fade-in">
          <div className="cell">
            <svg className="cell-icon" viewBox="0 0 74 74"><circle className="frame" cx="37" cy="37" r="30"/>
              <path className="stroke" d="M27 27 L20 37 L27 47"/><path className="stroke" d="M47 27 L54 37 L47 47"/>
              <circle className="dot-rose" cx="37" cy="24" r="2"/></svg>
            <div className="cell-title">Development</div>
            <div className="cell-tags">
              <span className="tag">Python</span><span className="tag">SQL</span><span className="tag">JavaScript</span>
              <span className="tag">Java</span><span className="tag">Liquid</span>
            </div>
          </div>
          <div className="cell">
            <svg className="cell-icon" viewBox="0 0 74 74"><circle className="frame" cx="37" cy="37" r="30"/>
              <rect className="stroke" x="24" y="26" width="17" height="13"/><rect className="stroke" x="35" y="38" width="15" height="11"/>
              <circle className="dot-moss" cx="49" cy="28" r="2"/></svg>
            <div className="cell-title">Web &amp; Commerce</div>
            <div className="cell-tags">
              <span className="tag">Shopify</span><span className="tag">HTML/CSS</span><span className="tag">Section Dev</span>
              <span className="tag">UI Design</span><span className="tag">UX Planning</span>
            </div>
          </div>
          <div className="cell">
            <svg className="cell-icon" viewBox="0 0 74 74"><circle className="frame" cx="37" cy="37" r="30"/>
              <path className="stroke" d="M24 30 h26 M24 37 h26 M24 44 h26"/>
              <circle className="dot-rose" cx="24" cy="30" r="1.6"/><circle className="dot-ink" cx="24" cy="37" r="1.6"/><circle className="dot-moss" cx="24" cy="44" r="1.6"/></svg>
            <div className="cell-title">Systems &amp; Infrastructure</div>
            <div className="cell-tags">
              <span className="tag">Linux</span><span className="tag">AWS</span><span className="tag">ERP/EAM</span>
              <span className="tag">Oracle DB</span><span className="tag">Cisco</span>
            </div>
          </div>
          <div className="cell">
            <svg className="cell-icon" viewBox="0 0 74 74"><circle className="frame" cx="37" cy="37" r="30"/>
              <ellipse className="stroke" cx="31" cy="37" rx="9" ry="6" transform="rotate(-20 31 37)"/>
              <ellipse className="stroke" cx="45" cy="37" rx="9" ry="6" transform="rotate(-20 45 37)"/>
              <circle className="dot-ink" cx="37" cy="30" r="1.8"/></svg>
            <div className="cell-title">Integration &amp; Ops</div>
            <div className="cell-tags">
              <span className="tag">REST API</span><span className="tag">SAP</span><span className="tag">SSO</span>
              <span className="tag">Firewall/ACL</span><span className="tag">Monitoring</span>
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience">
        <div className="home-section-head fade-in">
          <div className="eyebrow">Career</div>
          <h2>Work history</h2>
          <p className="section-desc">From enterprise asset management to e-commerce — a journey across industries and tech stacks.</p>
        </div>
        <div className="exp-list fade-in">

          <div className="exp-item">
            <div className="exp-header">
              <span className="exp-company">Commercial (Canada)<span className="exp-badge">Current</span></span>
              <span className="exp-period">2025 — Present · Calgary, AB</span>
            </div>
            <div className="exp-role">Shopify Web Designer &amp; Section Developer</div>
            <ul className="exp-bullets">
              <li>Leading <strong>Shopify storefront design and development</strong> — from concept and UX planning to implementation.</li>
              <li>Developing custom <strong>Shopify sections</strong> using Liquid, HTML, CSS, and JavaScript for a highly tailored shopping experience.</li>
              <li>Collaborating on web architecture, performance optimization, and cross-browser/device compatibility.</li>
            </ul>
            <div className="exp-tech">
              <span className="tech-tag2">Shopify</span><span className="tech-tag2">Liquid</span><span className="tech-tag2">JavaScript</span>
              <span className="tech-tag2">CSS</span><span className="tech-tag2">UX Design</span>
            </div>
          </div>

          <div className="exp-item">
            <div className="exp-header">
              <span className="exp-company">ATG (Asset Technology Group)</span>
              <span className="exp-period">Feb 2023 — Feb 2025 · Kyunggi-do, South Korea</span>
            </div>
            <div className="exp-role">Software Developer / IT Integration Engineer</div>
            <ul className="exp-bullets">
              <li>Customized Hexagon&apos;s <strong>AWS-based EAM solution for GS Power</strong> — built Python/SQL automation workflows syncing performance data across plant machinery, enabling predictive maintenance. Reduced manual reporting time by <strong>50%</strong>.</li>
              <li>Built <strong>API integrations</strong> between EAM platform and external SAP-based systems and in-house web services, automating maintenance scheduling across stakeholders.</li>
              <li>Partnered with Hexagon India to implement API integrations and SSO — resolved <strong>80+ front- and back-end issues</strong> during pre-go-live; coordinated bilingual technical communication (English/Korean).</li>
            </ul>
            <div className="exp-tech">
              <span className="tech-tag2">Python</span><span className="tech-tag2">SQL</span><span className="tech-tag2">AWS</span>
              <span className="tech-tag2">REST API</span><span className="tech-tag2">SAP</span><span className="tech-tag2">SSO</span><span className="tech-tag2">Oracle DB</span>
            </div>
          </div>

          <div className="exp-item">
            <div className="exp-header">
              <span className="exp-company">SEO Inc.</span>
              <span className="exp-period">Apr 2019 — Aug 2022 · Seoul, South Korea</span>
            </div>
            <div className="exp-role">IT Infrastructure &amp; Network Engineer</div>
            <ul className="exp-bullets">
              <li>Maintained <strong>40+ network devices</strong> supporting a 24/7 control room for AI-driven national maritime infrastructure across nine major ports. Ensured <strong>99.9% uptime</strong> through proactive monitoring.</li>
              <li>Managed <strong>IP allocation for 1,000+ endpoints</strong> (PCs, servers, IoT devices) through structured subnet planning, implementing firewall and ACL policies for secure network segmentation.</li>
              <li>Handled <strong>10+ infrastructure incidents per month</strong>, completing recovery within UPS grace periods. Achieved zero critical outages through rapid failover and hardware replacement.</li>
            </ul>
            <div className="exp-tech">
              <span className="tech-tag2">Cisco</span><span className="tech-tag2">Linux</span><span className="tech-tag2">Firewall</span>
              <span className="tech-tag2">ACL</span><span className="tech-tag2">Network Monitoring</span><span className="tech-tag2">IoT</span>
            </div>
          </div>

        </div>
      </section>

      {/* PROJECTS */}
      <section id="projects">
        <div className="home-section-head fade-in" style={{paddingTop: '5.5rem'}}>
          <div className="eyebrow">Selected Work</div>
          <h2>What I&apos;ve built</h2>
          <p className="section-desc">Key projects that demonstrate impact across software, infrastructure, and commerce.</p>
        </div>
        <div className="project-grid fade-in">
          <div className="project-cell">
            <div className="project-eyebrow">Automation</div>
            <div className="project-title">EAM Automation for GS Power</div>
            <div className="project-desc">Python/SQL workflows syncing plant machinery performance data to an AWS-based Enterprise Asset Management system. Enabled predictive maintenance and 100% data availability for audits.</div>
            <div className="project-meta"><b>50%</b> reporting time saved — Python, SQL, AWS</div>
          </div>
          <div className="project-cell">
            <div className="project-eyebrow">Integration</div>
            <div className="project-title">EAM ↔ SAP API Bridge</div>
            <div className="project-desc">Cross-platform API integration between Hexagon&apos;s EAM and SAP-based partner systems, consolidating asset status data and automating maintenance scheduling across stakeholders.</div>
            <div className="project-meta"><b>Full automation</b> — REST API, SAP, SSO</div>
          </div>
          <div className="project-cell">
            <div className="project-eyebrow">Infrastructure</div>
            <div className="project-title">Maritime Port Network Operations</div>
            <div className="project-desc">24/7 network infrastructure for AI-driven national maritime control rooms across 9 major Korean ports. Managed 40+ devices, 1,000+ endpoints, zero critical outages over 3+ years.</div>
            <div className="project-meta"><b>99.9%</b> uptime — Cisco, Linux, IoT</div>
          </div>
          <div className="project-cell">
            <div className="project-eyebrow">Commerce</div>
            <div className="project-title">Shopify Storefront Development</div>
            <div className="project-desc">Full Shopify web design and development at a Canadian commercial client — UX planning, custom section development with Liquid/JS, and responsive UI implementation.</div>
            <div className="project-meta"><b>Live production</b> — Shopify, Liquid, CSS</div>
          </div>
          <div className="project-cell">
            <div className="project-eyebrow">Go-Live</div>
            <div className="project-title">Hexagon EAM Pre-Live Deployment</div>
            <div className="project-desc">Collaborated with Hexagon India team to resolve 80+ front- and back-end issues during pre-go-live phase. Managed bilingual technical communication to accelerate issue resolution.</div>
            <div className="project-meta"><b>80+</b> issues resolved — English/Korean</div>
          </div>
          <div className="project-cell">
            <div className="project-eyebrow">Security</div>
            <div className="project-title">Network Segmentation &amp; Firewall</div>
            <div className="project-desc">Designed and implemented firewall policies and ACL rules for secure segmentation of a complex network with 1,000+ endpoints including IoT and server infrastructure.</div>
            <div className="project-meta"><b>Enterprise scale</b> — ACL, Firewall, Cisco</div>
          </div>
        </div>
      </section>

      {/* EDUCATION & CERTS */}
      <section id="education">
        <div className="home-section-head fade-in">
          <div className="eyebrow">Background</div>
          <h2>Education &amp; certifications</h2>
          <p className="section-desc">Academic foundation in security and engineering, backed by industry certifications.</p>
        </div>
        <div className="edu-grid fade-in">
          <div>
            <div className="col-label">Education</div>
            <ul className="edu-list">
              <li className="edu-item">
                <div className="edu-degree">M.S. in Security Information</div>
                <div className="edu-school">Soongsil University</div>
                <div className="edu-meta">Sep 2020 — Feb 2023 · Seoul, S. Korea · GPA 4.39/4.5</div>
              </li>
              <li className="edu-item">
                <div className="edu-degree">B.Eng. in Electronic Engineering</div>
                <div className="edu-school">Chungwoon University</div>
                <div className="edu-meta">Mar 2016 — Feb 2018 · S. Korea · GPA 3.87/4.5</div>
              </li>
              <li className="edu-item">
                <div className="edu-degree">High School Diploma</div>
                <div className="edu-school">Proverbsville High School</div>
                <div className="edu-meta">Jun 2010 — Mar 2011 · Philippines</div>
              </li>
            </ul>
          </div>
          <div>
            <div className="col-label">Certifications</div>
            <ul className="cert-list">
              <li className="cert-item">
                <div><div className="cert-name">CCNA — Cisco Certified Network Associate</div><div className="cert-issuer">Cisco</div></div>
                <span className="cert-year">2020</span>
              </li>
              <li className="cert-item">
                <div><div className="cert-name">Information Security Engineer</div><div className="cert-issuer">Ministry of Science and ICT, South Korea</div></div>
                <span className="cert-year">2018</span>
              </li>
              <li className="cert-item">
                <div><div className="cert-name">Industrial Engineer — Information Processing</div><div className="cert-issuer">Ministry of Science and ICT, South Korea</div></div>
                <span className="cert-year">2016</span>
              </li>
              <li className="cert-item">
                <div><div className="cert-name">Network Administrator 2</div><div className="cert-issuer">Information Qualification Agency, South Korea</div></div>
                <span className="cert-year">2014</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* RESEARCH INTERESTS */}
      <section id="research">
        <div className="home-section-head fade-in">
          <div className="eyebrow">Also Exploring</div>
          <h2>Graduate research interests</h2>
          <p className="section-desc">
            Currently preparing applications for a thesis-based Master&apos;s in AI/Deep Learning — building on the same efficiency-first mindset behind the automation work above.
          </p>
        </div>
        <div className="cell-grid cols-3 fade-in">
          <div className="cell">
            <svg className="cell-icon" viewBox="0 0 74 74"><circle className="frame" cx="37" cy="37" r="30"/>
              <path className="stroke" d="M22 37 L32 30 M32 30 L42 42 M42 42 L54 33" opacity="0.7"/>
              <circle className="dot-rose" cx="22" cy="37" r="2"/><circle className="dot-ink" cx="32" cy="30" r="1.6"/>
              <circle className="dot-moss" cx="42" cy="42" r="1.6"/><circle className="dot-ink" cx="54" cy="33" r="1.6"/></svg>
            <div className="cell-title">Efficient &amp; Sparse Deep Learning</div>
            <p className="cell-desc">Interested in model compression and sparse neural network training — reducing the computational cost of large-scale AI systems without sacrificing performance.</p>
          </div>
          <div className="cell">
            <svg className="cell-icon" viewBox="0 0 74 74"><circle className="frame" cx="37" cy="37" r="30"/>
              <path className="stroke" d="M22 44 h12 v-12 h12 v-12" opacity="0.7"/>
              <circle className="dot-rose" cx="46" cy="20" r="2"/></svg>
            <div className="cell-title">From Automation to AI Efficiency</div>
            <p className="cell-desc">5+ years spent optimizing enterprise systems to do more with less compute and less manual overhead — now bringing that mindset to neural network training and inference.</p>
          </div>
          <div className="cell">
            <svg className="cell-icon" viewBox="0 0 74 74"><circle className="frame" cx="37" cy="37" r="30"/>
              <path className="stroke" d="M25 27 h24 M25 34 h24 M25 41 h16 M25 48 h20" opacity="0.65"/></svg>
            <div className="cell-title">Academic CV Available</div>
            <p className="cell-desc">A research-focused CV, including relevant technical experience and target research direction, is available on request.</p>
          </div>
        </div>
        <div className="research-cta-wrap fade-in">
          <a className="research-cta" href="mailto:hyojinlisa.kim@gmail.com?subject=Research%20background%20inquiry">Reach out about research collaboration →</a>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact">
        <div className="contact-box fade-in">
          <div className="eyebrow">Contact</div>
          <h2>Let&apos;s work together</h2>
          <p className="section-desc" style={{margin: '0 auto', textAlign: 'center'}}>
            Currently based in Calgary, AB — open to full-time roles in software development, IT support, or web engineering.
          </p>
          <div className="contact-links">
            <a className="contact-link" href="mailto:hyojinlisa.kim@gmail.com">hyojinlisa.kim@gmail.com</a>
            <a className="contact-link" href="tel:+18257339679">+1 825-733-9679</a>
          </div>
          <div>
            <div className="visa-note"><b>Work-authorized in Canada</b> — 2-Year Working Holiday Visa (approved, extendable to 4 years)</div>
          </div>
        </div>
      </section>
    </>
  );
}
