import logging
from langchain_ollama import ChatOllama

logger = logging.getLogger(__name__)
llm = ChatOllama(model="llama3.2:1b")  # or whatever model you settled on

FAQ_KEYWORDS = {
    "appointment": ["appointment", "book", "schedule", "reschedule"],
    "hours": ["timing", "hours", "open", "close"],
}

RAG_KEYWORDS = ["symptom", "pain", "medicine", "condition", "treatment", 
                "headache", "fever", "cough", "cold", "flu", "sick", "ill"]

class RoutingAgent:
    def route(self, query: str, is_crisis: bool = False):
        if is_crisis:
            logger.info(f"Crisis flag detected, routing to ESCALATE: {query}")
            return "ESCALATE", None

        result = self.rule_based_route(query)
        if result[0] is not None:
            return result

        return self.model_fallback_route(query)

    def rule_based_route(self, query: str):
        query_lower = query.lower()
        for category, keywords in FAQ_KEYWORDS.items():
            if any(word in query_lower for word in keywords):
                logger.info(f"Routed to FAQ ({category}): {query}")
                return "FAQ", category
        if any(word in query_lower for word in RAG_KEYWORDS):
            logger.info(f"Routed to RAG: {query}")
            return "RAG", None
        return None, None

    def model_fallback_route(self, query: str):
        prompt = f"""You must respond with EXACTLY one word from this list: RAG, FAQ, ESCALATE
        No explanation. No punctuation. Just the single word.

        Query: {query}

        Word:"""

        response = llm.invoke(prompt)
        decision = response.content.strip().upper()

        if decision not in ["RAG", "FAQ", "ESCALATE"]:
            logger.warning(f"Model returned unexpected value '{decision}', defaulting to RAG: {query}")
            decision = "RAG"  # safe fallback

        logger.info(f"Routed to {decision} via model fallback: {query}")
        return decision, None
