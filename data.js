// ===================================
// Resume Data Structure
// ===================================

const resumeData = {
    personal: {
        name: "Lincoln Stewart",
        title: "Software Engineer — Intelligent Automation & Systems Integration",
        email: "lincolnstewart4@gmail.com",
        phone: "443-460-8224",
        location: "Hyattsville, MD, USA",
        linkedin: "https://www.linkedin.com/in/lincoln-stewart01",
        github: "https://github.com/llstewart",
        website: "github.io/MyWebsite/"
    },

    experience: [
        {
            id: 1,
            position: "Software Engineer",
            company: "Oshkosh Corporation / JLG",
            location: "Remote",
            startDate: "Jan 2024",
            endDate: "Present",
            current: true,
            description: [
                "Design, develop, test, and deploy enterprise-grade applications using Python, React.js, ASP.NET, Vue.js, and Ignition SCADA - Streamlining operations and boosting system efficiency by 25 percent.",
                "Fulfill DevOps efforts by Implementing CI/CD pipelines with GitHub Actions, achieving 40 percent faster deployments with zero downtime.",
                "Develop real-time monitoring dashboards as part of a broader system architecture, integrating telemetry and anomaly detection.",
                "Build secure REST APIs to enable cross-system communication, reducing data retrieval latency by 15 percent."
            ]
        },
        {
            id: 2,
            position: "System Engineer Intern",
            company: "Oshkosh Corporation / JLG",
            location: "Hagerstown, MD",
            startDate: "Jun 2022",
            endDate: "Dec 2023",
            current: false,
            description: [
                "Built and deployed deep learning models using Azure ML and TensorFlow for real-time text recognition, achieving 98 percent accuracy and scaling to multiple sites.",
                "Created real-time alarm dashboards with React, JavaScript, Python, and SQL, reducing operational downtime by 25 percent.",
                "Reconfigured robotic system operations in C++ to improve welding precision by 30 percent, while configuring Linux servers to support 24/7 diagnostics, enhancing uptime by 20 percent."
            ]
        }
    ],

    projects: [
        {
            id: 1,
            name: "Sellorie",
            tagline: "AI-Powered Restaurant Automation",
            date: "Jul 2025 - Present",
            icon: "fa-robot",
            description: [
                "Developed Sellorie, an AI-powered SaaS that automates restaurant phone orders and reservations using voice interfaces and third-party APIs. Engineered backend middleware for real-time transaction handling, webhook reliability, and monitoring across Clover, Stripe, and n8n integrations.",
                "Integrated and fine-tuned a custom AI voice using the ElevenLabs API, trained for natural, human-like phone interactions tailored to restaurant environments.",
                "Built the front-end using Next.js, TypeScript, and React hooks, emphasizing modularity and high performance.",
                "Engineered middleware orchestration between the voice engine, n8n automation, and Sellorie's backend to maintain low latency and contextual memory across sessions.",
                "Designed the voice workflow to handle real-time conversational logic, mapping speech recognition outputs to structured reservation and ordering actions."
            ],
            technologies: ["Next.js", "TypeScript", "React", "ElevenLabs API", "n8n", "Stripe", "Clover API", "AI/ML"]
        },
        {
            id: 2,
            name: "PulseHue",
            tagline: "Spotify × Govee Ambient Lighting Sync",
            date: "Jan 2025 - Jun 2025",
            icon: "fa-lightbulb",
            description: [
                "Developed an app that connects Spotify and Govee APIs to sync ambient lighting with album artwork colors, using local middleware for real-time transitions and latency control—demonstrating low-latency orchestration and edge communication principles.",
                "Integrated Spotify Web API (OAuth 2.0, REST endpoints) with Govee Local LAN API to enable direct light control without cloud latency.",
                "Developed a Node.js/Express middleware service to handle real-time event streaming, JSON payload parsing, and asynchronous lighting commands.",
                "Implemented HSL-to-RGB color mapping and dominant color extraction using image analysis for dynamic scene rendering."
            ],
            technologies: ["Node.js", "Express", "Spotify API", "Govee API", "OAuth 2.0", "Color Analysis", "Real-time Processing"]
        }
    ],

    skills: {
        languages: [
            { name: "Python", icon: "fa-python" },
            { name: "TypeScript", icon: "fa-code" },
            { name: "JavaScript", icon: "fa-js" },
            { name: "C++", icon: "fa-code" },
            { name: "HTML", icon: "fa-html5" },
            { name: "CSS", icon: "fa-css3-alt" },
            { name: "SQL", icon: "fa-database" },
            { name: "Bash/Shell", icon: "fa-terminal" }
        ],
        frameworks: [
            { name: "React.js", icon: "fa-react" },
            { name: "Vue.js", icon: "fa-vuejs" },
            { name: "Node.js", icon: "fa-node-js" },
            { name: "Django/Flask", icon: "fa-python" },
            { name: ".NET", icon: "fa-code" },
            { name: "Bootstrap", icon: "fa-bootstrap" },
            { name: "PyTorch", icon: "fa-brain" },
            { name: "TensorFlow", icon: "fa-brain" }
        ],
        tools: [
            { name: "Docker", icon: "fa-docker" },
            { name: "Git", icon: "fa-git-alt" },
            { name: "GitHub", icon: "fa-github" },
            { name: "Azure SDK", icon: "fa-cloud" },
            { name: "Google Cloud", icon: "fa-cloud" },
            { name: "VS Code", icon: "fa-code" },
            { name: "PostgreSQL", icon: "fa-database" },
            { name: "SQL Server", icon: "fa-database" },
            { name: "Linux/Unix", icon: "fa-linux" },
            { name: "CI/CD", icon: "fa-infinity" },
            { name: "REST API", icon: "fa-server" },
            { name: "Microsoft Power Platform", icon: "fa-bolt" }
        ],
        systems: [
            { name: "Ignition SCADA", icon: "fa-industry" },
            { name: "OPC-UA", icon: "fa-network-wired" },
            { name: "MQTT", icon: "fa-exchange-alt" },
            { name: "OpenCV", icon: "fa-camera" },
            { name: "Server Configuration", icon: "fa-server" },
            { name: "Database Design", icon: "fa-sitemap" },
            { name: "Cloud Deployment", icon: "fa-cloud-upload-alt" }
        ]
    },

    education: {
        institution: "University of Maryland College Park",
        degree: "B.S Information Science",
        startDate: "Jan 2021",
        endDate: "Dec 2023"
    },

    stats: {
        efficiencyBoost: 25,
        modelAccuracy: 98,
        fasterDeployments: 40,
        reducedLatency: 15
    }
};
