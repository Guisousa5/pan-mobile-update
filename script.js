// Elementos de interação
const chatBox = document.querySelector('.chat-box');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendMessageButton');
const micButton = document.getElementById('micButton');
const soundToggleButton = document.getElementById('soundToggleButton');
const clearChatButton = document.getElementById('clearChatButton');
const setVoiceButton = document.getElementById('setVoiceButton');
const voiceSelect = document.getElementById('voiceSelect');
let isSoundOn = true;

// Verifica se o navegador suporta a API de síntese de fala
let synth = window.speechSynthesis;

// Carrega todas as vozes disponíveis no navegador
function loadVoices() {
    const voices = synth.getVoices();
    console.log(voices);  // Verifique as vozes carregadas
    if (voices.length === 0) {
        setTimeout(loadVoices, 100);
        return;
    }

    voiceSelect.innerHTML = ''; // Limpa as opções anteriores

    voices.forEach(voice => {
        if (voice.lang.startsWith('pt')) { // Filtra por idioma 'pt' (português)
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        }
    });
}

// Carrega as vozes quando elas estiverem disponíveis
synth.onvoiceschanged = loadVoices;
loadVoices();

// Função para falar o texto
function speak(text) {
    if (!isSoundOn || !synth) return;

    synth.cancel(); // Cancela qualquer fala anterior antes de iniciar a nova
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voiceSelect.value;
    const voices = synth.getVoices();
    const voice = voices.find(v => v.voiceURI === selectedVoice);

    if (voice) {
        utterance.voice = voice;
    }

    synth.speak(utterance);
}

// Botão para exibir/ocultar a seleção de vozes
setVoiceButton.addEventListener('click', () => {
    voiceSelect.style.display = voiceSelect.style.display === 'none' ? 'block' : 'none';
});

// Botão de alternância de som
soundToggleButton.addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    if (!isSoundOn) synth.cancel();
    soundToggleButton.innerHTML = isSoundOn
        ? '<i class="bi bi-volume-up-fill"></i>'
        : '<i class="bi bi-volume-mute-fill"></i>';
});
// Função para exibir mensagens no chat
function displayMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add(type === 'user' ? 'user-message' : 'assistant-message');

    // Cria um elemento de imagem para o assistente
    if (type === 'assistant') {
        const assistantImage = document.createElement('img');
        assistantImage.src = 'baixados.png'; // Substitua pela URL da imagem do assistente
        assistantImage.alt = 'Assistente';
        assistantImage.classList.add('assistant-image'); // Adicione uma classe para estilização, se necessário

        // Cria uma bolinha
        const dot = document.createElement('span');
        dot.classList.add('dot'); // Adicione uma classe para estilização
        dot.textContent = '● '; // Representa a bolinha
        dot.style.color = 'blue'; // Você pode mudar a cor da bolinha aqui

        // Adiciona a imagem e a bolinha ao messageDiv
        messageDiv.appendChild(assistantImage);
        messageDiv.appendChild(dot);
    }

    // Adiciona a mensagem de texto
    const textNode = document.createTextNode(message);
    messageDiv.appendChild(textNode);

    // Adiciona a mensagem ao chat
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Salva a mensagem no localStorage
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    messages.push({ message, type });
    localStorage.setItem('chatMessages', JSON.stringify(messages));
}

function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    messages.forEach(({ message, type }) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(type === 'user' ? 'user-message' : 'assistant-message');
        messageDiv.textContent = message;
        chatBox.appendChild(messageDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Chame a função loadMessages quando a página for carregada
document.addEventListener('DOMContentLoaded', loadMessages);

// Função para obter a resposta do assistente via API
async function getAssistantResponse(message) {
    const loadingMessage = "...";
    displayMessage(loadingMessage, 'assistant');

    try {
        const response = await fetch('https://panapi-production.up.railway.app/answer-user/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Erro ao obter resposta do assistente");
        }

        const data = await response.json();
        const rawResponse = data.raw || "Resposta não encontrada";

        const assistantMessages = document.querySelectorAll('.assistant-message');
        if (assistantMessages.length > 0) {
            assistantMessages[assistantMessages.length - 1].remove();
        }

        displayMessage(rawResponse, 'assistant');
        speak(rawResponse);

    } catch (error) {
        console.error("Erro ao processar a resposta do assistente:", error);
        const errorMessage = "Desculpe, ocorreu um erro ao obter a resposta: " + error.message;

        const assistantMessages = document.querySelectorAll('.assistant-message');
        if (assistantMessages.length > 0) {
            assistantMessages[assistantMessages.length - 1].remove();
        }

        displayMessage(errorMessage, 'assistant');
        speak(errorMessage);
    }
}

// Função para processar o envio da mensagem
function sendMessage() {
    const userText = userInput.value.trim();
    if (userText) {
        displayMessage(userText, 'user');
        getAssistantResponse(userText);
        userInput.value = '';
    }
}

// Envio de mensagem ao pressionar a tecla Enter
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Envio de mensagem ao clicar no botão de enviar
sendButton.addEventListener('click', sendMessage);

// Função para limpar o chat
clearChatButton.addEventListener('click', () => {
    const userConfirmed = confirm("Tem certeza de que deseja limpar o chat?");
    if (userConfirmed) {
        clearChat();
    }
});

function clearChat() {
    chatBox.innerHTML = ''; // Limpa o conteúdo do chat
    localStorage.removeItem('chatMessages'); // Remove as mensagens do armazenamento local
}

// Feedback do usuário
document.getElementById('feedbackButton').addEventListener('click', async () => {
    const feedbackText = document.getElementById('feedbackText').value.trim();
    const feedbackMessage = document.getElementById('feedbackMessage');

    if (!feedbackText || feedbackText.length < 5) {
        showFeedbackMessage("Por favor, insira pelo menos 5 caracteres de feedback antes de enviar.", 'red');
        return;
    }

    const feedbackId = crypto.randomUUID();

    try {
        const response = await fetch("https://panapi-production.up.railway.app/save_feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: feedbackText, feedback_id: feedbackId })
        });

        if (response.ok) {
            showFeedbackMessage("Feedback salvo com sucesso!", 'green');
        } else {
            showFeedbackMessage("Muito obrigado pelo seu feedback! Suas sugestões são essenciais para melhorarmos continuamente o Pan. Agradecemos sua colaboração e estamos sempre trabalhando para tornar o assistente cada vez mais útil para você", 'green');
        }
    } catch (error) {
        showFeedbackMessage("Erro ao enviar feedback: " + error.message, 'red');
    }

    document.getElementById('feedbackText').value = '';
    setTimeout(() => {
        feedbackMessage.style.display = 'none';
    }, 5000);
});

// Alternar tema
document.addEventListener('DOMContentLoaded', () => {
    const toggleThemeButton = document.getElementById('toggleThemeButton');

    toggleThemeButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const elementsToToggle = [
            '.chat-container',
            '.header',
            '.chat-box',
            '.input-section',
            '.feedback-container',
            ...document.querySelectorAll('.user-message, .assistant-message')
        ];

        elementsToToggle.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.classList.toggle('dark-mode');
            }
        });
    });
});

function showFeedbackMessage(message, color) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    feedbackMessage.style.display = 'block';
    feedbackMessage.textContent = message;
    feedbackMessage.style.color = color;
}
