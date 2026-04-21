import React from 'react';
import DiseasesBox from '../../components/chatbot/ContextBox/DiseasesBox';
import { ChatContext } from 'context/Chat';
import { http } from 'msw';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Mock disease data
const mockDiseases = [
    'fever',
    'cough',
    'headache',
    'fatigue',
    'nausea',
    'shortness of breath',
    'sore throat'
];

const covidMarkdown = `

Coronavirus disease (COVID-19) is an infectious disease caused by the SARS-CoV-2 virus.

### Symptoms
* Fever
* Cough
* Shortness of breath
* Fatigue
* Loss of taste or smell

### Severity
Most people infected with the virus will experience mild to moderate respiratory illness and recover without requiring special treatment. However, some will become seriously ill and require medical attention.

### Prevention
* Get vaccinated
* Wear masks in crowded settings
* Maintain good hand hygiene
`;

// Mock disease descriptions that would come from Firebase
const mockDiseaseDescriptions = [
    {
        name: 'Common Cold',
        match: ['cough', 'sore throat', 'fever', 'headache'],
        description: 'The common cold is a viral infection of your nose and throat (upper respiratory tract). Many types of viruses can cause a common cold.\n\nHealthy adults can expect to have two or three colds annually. Most people recover from a common cold in 7 to 10 days. Symptoms might last longer in people who smoke.'
    },
    {
        name: 'Influenza',
        match: ['fever', 'fatigue', 'cough', 'headache'],
        description: 'Influenza (flu) is a viral infection that attacks your respiratory system — your nose, throat and lungs.\n\nFor most people, the flu resolves on its own. But sometimes, influenza and its complications can be deadly. People at higher risk of developing flu complications include young children, pregnant women, older adults, and people with chronic illnesses.'
    },
    {
        name: 'COVID-19',
        match: ['fever', 'cough', 'shortness of breath', 'fatigue'],
        description: covidMarkdown
    },
    {
        name: 'Migraine',
        match: ['headache', 'nausea'],
        description: "A migraine is a headache that can cause severe throbbing pain or a pulsing sensation, usually on one side of the head. It's often accompanied by nausea, vomiting, and extreme sensitivity to light and sound.\n\nMigraine attacks can last for hours to days, and the pain can be so severe that it interferes with your daily activities."
    }
];

// Mock ChatContext
const ChatContextWrapper = ({ children, value }) => (
    <ChatContext.Provider value={value}>
        {children}
    </ChatContext.Provider>
);

// Create a theme instance
const theme = createTheme({
    palette: {
        primary: {
            main: '#117aca',
        },
        secondary: {
            main: '#1C4685',
        },
    },
});

// Create a decorator that manages the descOpen state
const WithManagedState = (Story, context) => {
    const [descOpen, setDescOpen] = React.useState(context.args.chatContext.descOpen);

    // Update the context with the managed state
    const chatContext = {
        ...context.args.chatContext,
        descOpen: descOpen,
        setDescOpen: (value) => {
            console.log('setDescOpen called with:', value);
            setDescOpen(value);
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ChatContextWrapper value={chatContext}>
                <div style={{ height: '500px', width: '100%', padding: '20px', backgroundColor: '#f5f5f5' }}>
                    <Story args={{ ...context.args, chatContext }} />
                </div>
            </ChatContextWrapper>
        </ThemeProvider>
    );
};

export default {
    title: 'Chat/DiseasesBox',
    component: DiseasesBox,
    parameters: {
        layout: 'fullscreen',
        msw: {
            handlers: [
                // Mock any Firebase API calls here
                http.get('/api/diseases', (req, res, ctx) => {
                    return res(ctx.json(mockDiseaseDescriptions));
                }),
            ],
        },
    },
    decorators: [WithManagedState],
};

// Default story with collapsed view
export const Default = {
    args: {
        diseases: mockDiseases,
        expanded: false,
        visible: true,
        openTab: () => { },
        mockDiseaseData: mockDiseaseDescriptions,
        chatContext: {
            keyword: '',
            descOpen: false,
            setDescOpen: () => { }
        }
    }
};

// With fewer diseases
export const FewerDiseases = {
    args: {
        ...Default.args,
        diseases: ['headache', 'nausea'],
        expanded: true
    }
};

// With more diseases
export const MoreDiseases = {
    args: {
        ...Default.args,
        diseases: [
            ...mockDiseases,
            'dizziness',
            'runny nose',
            'body aches',
            'chills',
            'loss of taste',
            'loss of smell',
            'diarrhea',
            'vomiting',
            'rash',
            'joint pain',
            'muscle pain',
            'abdominal pain',
            'chest pain',
            'swollen glands',
            'congestion',
            'insomnia',
            'dizziness',
            'blurred vision',
            'ear pain',
            'sinus pressure',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
            'headache',
        ],
        expanded: true
    }
}; 