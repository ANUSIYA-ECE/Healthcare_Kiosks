from sentence_transformers import SentenceTransformer, util

# Load pre-trained SentenceTransformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

def semantic_match(user_symptoms, known_symptoms, threshold=0.6, top_k=1):
    """
    Match user symptoms to known symptoms using semantic similarity.

    Args:
        user_symptoms (list of str): Raw symptoms entered by the user.
        known_symptoms (list of str): All symptoms from the training dataset.
        threshold (float): Minimum similarity score to consider a valid match.
        top_k (int): Number of top matches to consider for each user symptom.

    Returns:
        list: Matched known symptoms from training data.
    """
    if not user_symptoms or not known_symptoms:
        return []

    matched = []
    
    # Preprocess: lowercase and replace spaces with underscores
    user_symptoms = [sym.strip().lower().replace(" ", "_") for sym in user_symptoms if sym.strip()]
    known_symptoms = [sym.strip().lower().replace(" ", "_") for sym in known_symptoms if sym.strip()]

    # Generate embeddings
    user_embeddings = model.encode(user_symptoms, convert_to_tensor=True)
    known_embeddings = model.encode(known_symptoms, convert_to_tensor=True)

    for i, user_sym in enumerate(user_symptoms):
        sims = util.cos_sim(user_embeddings[i], known_embeddings)[0]
        top_indices = sims.topk(k=top_k).indices.tolist()

        for idx in top_indices:
            score = sims[idx].item()
            if score >= threshold:
                match = known_symptoms[idx]
                if match not in matched:
                    matched.append(match)

    return matched
