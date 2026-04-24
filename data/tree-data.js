/**
 * AI Strategy Pillars — Australian Mutual Banking
 *
 * Structure: 8 independent pillars (no shared root).
 * Each pillar = a major opportunity area for AI-enabled change.
 * Branches under each pillar = strategic features and deliverables
 * that reshape the operating model around an AI-augmented workforce
 * and a member-centred, resilient experience.
 *
 * Depth: Pillar (L1) → Strategic Feature (L2) → Capability (L3).
 * Layout (_x / _y) is computed on load; do not hand-edit here.
 *
 * Regulatory anchors informing the structure:
 *   - APRA CPS 230 (Operational Risk Management, in force)
 *   - APRA CPS 234 (Information Security)
 *   - AUSTRAC AML/CTF reforms (2026 phased)
 *   - Scam Prevention Framework (legislated 2025)
 *   - Financial Accountability Regime (FAR)
 *   - Consumer Data Right (CDR)
 *   - Banking Code of Practice
 */
window.TREE_DATA = {
  "title": "AI Strategy Pillars — Mutual Banking",
  "nodes": [

    /* ════════════════════════════════════════════════════════════════
       PILLAR 1 — MEMBER EXPERIENCE
       Outcome: Every member interaction feels human, personal, instant.
       Frontline staff supported in the moments that matter.
    ════════════════════════════════════════════════════════════════ */
    {
      "id": "p-mx",
      "title": "MEMBER\nEXPERIENCE",
      "desc": "Transform every member touchpoint with AI-augmented service that feels human, personal and instant — and frees staff to focus on moments that truly matter.",
      "icon": "💬", "status": "prog", "parent": null,
      "deps": [], "link": "", "etaDate": "",
      "childLayout": "vertical"
    },

    {
      "id": "mx-support",
      "title": "24/7 MEMBER\nSUPPORT",
      "desc": "Self-service and intelligent routing across voice and digital, so members get help any hour and complex needs reach the right human quickly.",
      "icon": "🕐", "status": "prog", "parent": "p-mx",
      "deps": [], "link": "", "etaDate": "",
      "childLayout": "horizontal-right"
    },
    {
      "id": "mx-support-voice",
      "title": "VOICE AI\nSELF-SERVICE",
      "desc": "After-hours voice assistant handling balances, transactions, card actions and account queries in natural conversation.",
      "icon": "🎙", "status": "plan", "parent": "mx-support",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "mx-support-route",
      "title": "INTELLIGENT\nROUTING",
      "desc": "Intent detection and context-aware routing to the best-equipped agent, reducing transfers and wait times.",
      "icon": "🧭", "status": "prog", "parent": "mx-support",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "mx-support-auth",
      "title": "VOICE &\nBEHAVIOURAL AUTH",
      "desc": "Biometric voice and behavioural signals to authenticate members seamlessly and resist impersonation.",
      "icon": "🔑", "status": "plan", "parent": "mx-support",
      "deps": [], "link": "", "etaDate": ""
    },

    {
      "id": "mx-copilot",
      "title": "AGENT\nCOPILOT",
      "desc": "Real-time assistance for contact centre staff: knowledge, suggestions, compliance checks and automated wrap-up.",
      "icon": "🤖", "status": "prog", "parent": "p-mx",
      "deps": [], "link": "", "etaDate": "",
      "childLayout": "horizontal-right"
    },
    {
      "id": "mx-copilot-summary",
      "title": "LIVE CALL\nSUMMARY",
      "desc": "Real-time transcription with auto-generated call notes and CRM updates, reducing after-call work.",
      "icon": "📝", "status": "prog", "parent": "mx-copilot",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "mx-copilot-nba",
      "title": "NEXT-BEST\nACTION PROMPTS",
      "desc": "Context-aware suggestions for the next conversation step — retention, cross-sell, hardship support.",
      "icon": "🎯", "status": "plan", "parent": "mx-copilot",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "mx-copilot-comply",
      "title": "COMPLIANCE\nWHISPER",
      "desc": "Silently flags required disclosures, regulated language and script adherence during live calls.",
      "icon": "🛎", "status": "plan", "parent": "mx-copilot",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "mx-copilot-wrap",
      "title": "AUTO\nWRAP-UP",
      "desc": "Suggests call disposition, updates systems and drafts follow-up correspondence.",
      "icon": "✅", "status": "plan", "parent": "mx-copilot",
      "deps": [], "link": "", "etaDate": ""
    },

    {
      "id": "mx-pers",
      "title": "HYPER-\nPERSONALISATION",
      "desc": "Each member sees content, offers and guidance relevant to their life and goals — not a generic experience.",
      "icon": "✨", "status": "plan", "parent": "p-mx",
      "deps": [], "link": "", "etaDate": "",
      "childLayout": "horizontal-right"
    },
    {
      "id": "mx-pers-life",
      "title": "LIFE-EVENT\nDETECTION",
      "desc": "Spot signals for home purchase, new job, retirement or family change to offer timely help.",
      "icon": "🌱", "status": "plan", "parent": "mx-pers",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "mx-pers-offer",
      "title": "CONTEXTUAL\nOFFER ENGINE",
      "desc": "Present the right product or service in the right channel at the right moment.",
      "icon": "🎁", "status": "plan", "parent": "mx-pers",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "mx-pers-well",
      "title": "FINANCIAL\nWELLNESS NUDGES",
      "desc": "Personalised coaching and saving prompts to help members build financial resilience.",
      "icon": "💚", "status": "expl", "parent": "mx-pers",
      "deps": [], "link": "", "etaDate": ""
    },

    {
      "id": "mx-omni",
      "title": "OMNICHANNEL\nCONTINUITY",
      "desc": "Seamless hand-off across phone, chat, app and branch — one member, one conversation.",
      "icon": "🔀", "status": "plan", "parent": "p-mx",
      "deps": [], "link": "", "etaDate": "",
      "childLayout": "horizontal-right"
    },
    {
      "id": "mx-omni-view",
      "title": "UNIFIED\nMEMBER VIEW",
      "desc": "Single real-time view of each member across products, channels and interactions.",
      "icon": "👤", "status": "prog", "parent": "mx-omni",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "mx-omni-cont",
      "title": "CONVERSATION\nCONTINUITY",
      "desc": "Resume a conversation from where it left off — chat → call → branch — without repeating context.",
      "icon": "↪", "status": "plan", "parent": "mx-omni",
      "deps": [], "link": "", "etaDate": ""
    },

    /* ════════════════════════════════════════════════════════════════
       PILLAR 2 — LENDING & CREDIT
       Outcome: Compress loan decisions from days to minutes while
       keeping member-centred judgement at the core.
    ════════════════════════════════════════════════════════════════ */
    {
      "id": "p-ln",
      "title": "LENDING &\nCREDIT",
      "desc": "Reshape the lending operating model with AI-driven intake, serviceability and portfolio care — faster decisions, stronger outcomes, fewer handoffs.",
      "icon": "💰", "status": "prog", "parent": null,
      "deps": [], "link": "", "etaDate": ""
    },

    {
      "id": "ln-intake",
      "title": "AUTOMATED\nDOCUMENT INTAKE",
      "desc": "Extract, classify and verify loan application documents instantly, replacing manual review queues.",
      "icon": "📄", "status": "prog", "parent": "p-ln",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-intake-income",
      "title": "INCOME &\nPAYSLIP EXTRACTION",
      "desc": "Automated extraction of income data from payslips, ATO statements and employer letters.",
      "icon": "💵", "status": "prog", "parent": "ln-intake",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-intake-stmt",
      "title": "BANK STATEMENT\nANALYSIS",
      "desc": "Categorise transactions, verify income and identify expenses across member-supplied statements.",
      "icon": "📊", "status": "prog", "parent": "ln-intake",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-intake-id",
      "title": "ID & BIOMETRIC\nVERIFICATION",
      "desc": "Liveness checks, document verification and biometric matching against verified ID.",
      "icon": "🪪", "status": "prog", "parent": "ln-intake",
      "deps": [], "link": "", "etaDate": ""
    },

    {
      "id": "ln-serve",
      "title": "AI-ASSISTED\nSERVICEABILITY",
      "desc": "Evidence-based serviceability assessment with explainable outputs that support responsible lending obligations.",
      "icon": "⚖", "status": "plan", "parent": "p-ln",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-serve-hem",
      "title": "EXPENSE\nBENCHMARKING",
      "desc": "Calibrate member-declared expenses against HEM plus behavioural spending to reduce under-stated risk.",
      "icon": "📐", "status": "plan", "parent": "ln-serve",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-serve-stab",
      "title": "INCOME STABILITY\nMODELLING",
      "desc": "Nuanced treatment of casual, contract, gig and variable income to fairly serve the modern workforce.",
      "icon": "📈", "status": "plan", "parent": "ln-serve",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-serve-exp",
      "title": "EXPLAINABLE\nCREDIT DECISIONS",
      "desc": "Every decision accompanied by a plain-English rationale the member and regulator can understand.",
      "icon": "🔍", "status": "plan", "parent": "ln-serve",
      "deps": [], "link": "", "etaDate": ""
    },

    {
      "id": "ln-arrears",
      "title": "PORTFOLIO &\nARREARS INTELLIGENCE",
      "desc": "Spot hardship early and act with empathy — keeping members housed and performing.",
      "icon": "🛟", "status": "plan", "parent": "p-ln",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-arrears-ews",
      "title": "EARLY WARNING\nSIGNALS",
      "desc": "Behavioural and transactional models predicting hardship months before traditional arrears.",
      "icon": "⚠", "status": "plan", "parent": "ln-arrears",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-arrears-hard",
      "title": "HARDSHIP\nOUTREACH AGENT",
      "desc": "Tailored contact plans and conversation guides for members showing financial stress.",
      "icon": "🤝", "status": "plan", "parent": "ln-arrears",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-arrears-coll",
      "title": "COLLECTIONS\nCOPILOT",
      "desc": "Agent-side assistant suggesting empathetic, compliant negotiation paths and hardship options.",
      "icon": "💬", "status": "expl", "parent": "ln-arrears",
      "deps": [], "link": "", "etaDate": ""
    },

    {
      "id": "ln-jour",
      "title": "MEMBER-LED\nLENDING JOURNEYS",
      "desc": "Conversational, self-serve experiences that adapt to how each member wants to apply.",
      "icon": "🗺", "status": "plan", "parent": "p-ln",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-jour-conv",
      "title": "CONVERSATIONAL\nAPPLICATION",
      "desc": "Natural-language loan application that collects required data through dialogue, not long forms.",
      "icon": "🗣", "status": "plan", "parent": "ln-jour",
      "deps": [], "link": "", "etaDate": ""
    },
    {
      "id": "ln-jour-pre",
      "title": "PRE-APPROVAL\nNUDGES",
      "desc": "Proactively notify eligible members of pre-approved offers aligned to their life stage.",
      "icon": "📬", "status": "expl", "parent": "ln-jour",
      "deps": [], "link": "", "etaDate": ""
    }
  ],
  "positions": {}
};
