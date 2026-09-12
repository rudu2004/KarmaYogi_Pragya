const BACKEND_BASE_URL = window.location.origin + '/api/v1';

async function fetchDiagnosticQuiz(topic, language) {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/diagnostic?topic=${encodeURIComponent(topic)}&lang=${language}`);
        if (!response.ok) throw new Error('API failed');
        return await response.json();
    } catch (error) {
        console.warn('Backend unavailable, using mock diagnostic data');
        return getMockDiagnosticQuiz(language);
    }
}

async function submitDiagnostic(topic, answers) {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/submit_diagnostic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, answers })
        });
        if (!response.ok) throw new Error('API failed');
        return await response.json();
    } catch (error) {
        console.warn('Backend unavailable, using mock submission response');
        return getMockSubmissionResponse();
    }
}

async function fetchCourseSyllabus(courseId, language) {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/igot/course/${courseId}?lang=${language}`);
        if (!response.ok) throw new Error('API failed');
        return await response.json();
    } catch (error) {
        console.warn('Backend unavailable, using mock syllabus data');
        return getMockCourseSyllabus(courseId, language);
    }
}

// Keeping previous methods for backwards compatibility
async function uploadManualAndGetQuiz(fileObject) {
    const formData = new FormData();
    formData.append('file', fileObject);
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/upload_document`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Assessment generation failed.');
        return await response.json();
    } catch (error) {
        return {
            quiz_id: 'mock_upload_quiz',
            questions: getMockDiagnosticQuiz('en').questions
        };
    }
}

async function submitAssessmentResponses(payload) {
    return submitDiagnostic(payload.topic, payload.responses);
}

// Mock Data Generators

function getMockDiagnosticQuiz(language) {
    const q1 = language === 'hi' ? "राष्ट्रीय आय के आकलन के लिए किस विधि का उपयोग नहीं किया जाता है?" : "Which method is NOT used for National Income estimation?";
    return {
        quiz_id: "diag_mock_1",
        questions: [
            // Easy
            { id: 1, difficulty: 'Easy', question: q1, options: ["Value Added Method", "Income Method", "Expenditure Method", "Export-Import Method"], correct_option: "Export-Import Method", competency_tag: 'Fundamentals' },
            { id: 2, difficulty: 'Easy', question: "What is the primary objective of a sample survey?", options: ["To study the whole population", "To make inferences about population parameters", "To conduct census", "To list all individuals"], correct_option: "To make inferences about population parameters", competency_tag: 'Fundamentals' },
            { id: 3, difficulty: 'Easy', question: "CPI stands for?", options: ["Consumer Price Index", "Central Price Indicator", "Cost of Production Index", "Consumer Profit Index"], correct_option: "Consumer Price Index", competency_tag: 'Fundamentals' },
            // Medium
            { id: 4, difficulty: 'Medium', question: "Which sampling design is most appropriate for a heterogeneous population?", options: ["Simple Random Sampling", "Stratified Sampling", "Cluster Sampling", "Systematic Sampling"], correct_option: "Stratified Sampling", competency_tag: 'Application' },
            { id: 5, difficulty: 'Medium', question: "What does Gross Value Added (GVA) at basic prices exclude?", options: ["Production taxes", "Product taxes", "Subsidies on production", "Depreciation"], correct_option: "Product taxes", competency_tag: 'Application' },
            { id: 6, difficulty: 'Medium', question: "Non-sampling errors can occur in?", options: ["Sample surveys only", "Complete enumerations only", "Both sample surveys and complete enumerations", "Neither"], correct_option: "Both sample surveys and complete enumerations", competency_tag: 'Quality Assurance' },
            { id: 7, difficulty: 'Medium', question: "The base year for IIP (Index of Industrial Production) in India currently is?", options: ["2004-05", "2011-12", "2015-16", "2020-21"], correct_option: "2011-12", competency_tag: 'Application' },
            // Hard
            { id: 8, difficulty: 'Hard', question: "In National Accounts, what is the treatment of 'Changes in Inventories'?", options: ["Treated as intermediate consumption", "Treated as capital formation", "Excluded from GDP", "Treated as final consumption expenditure"], correct_option: "Treated as capital formation", competency_tag: 'Advanced Analysis' },
            { id: 9, difficulty: 'Hard', question: "What is the Laspeyres index formula used for?", options: ["Calculating current weighted price index", "Calculating base weighted price index", "Calculating unweighted price index", "Geometric mean of prices"], correct_option: "Calculating base weighted price index", competency_tag: 'Advanced Analysis' },
            { id: 10, difficulty: 'Hard', question: "Which of the following is an example of non-observed economy?", options: ["Public sector enterprises", "Listed private companies", "Informal sector activities", "Foreign direct investments"], correct_option: "Informal sector activities", competency_tag: 'Problem Solving' }
        ]
    };
}

function getMockSubmissionResponse() {
    return {
        score: 60,
        skill_level: "Intermediate",
        flagged_weak_spots: ["Advanced Analysis", "Problem Solving"],
        pathway: [
            { id: "c1", step: 1, title: "Foundation: Statistical Survey Design", difficulty: "Beginner" },
            { id: "c2", step: 2, title: "Intermediate Mastery: National Accounts", difficulty: "Intermediate" },
            { id: "c3", step: 3, title: "Advanced Specialization: Price Indices", difficulty: "Advanced" }
        ]
    };
}

function getMockCourseSyllabus(courseId, language) {
    const title = language === 'hi' ? "उन्नत सांख्यिकी (Advanced Statistics)" : "Advanced Statistics";
    return {
        course_id: courseId,
        title: title,
        breakdown: ["Module 1: Introduction", "Module 2: Core Concepts", "Module 3: Case Studies"],
        study_notes: "Key concepts include understanding variance, standard error, and hypothesis testing...",
        practice_questions: [
            { q: "What is the standard error?", options: ["Variance / n", "Sqrt(Variance/n)", "Mean", "Mode"], a: "Sqrt(Variance/n)" }
        ]
    };
}
