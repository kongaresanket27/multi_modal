# Gradient Descent
Gradient descent minimizes a differentiable loss by repeatedly updating each parameter.
The update rule is theta_next = theta_current - learning_rate * gradient(loss, theta).
The learning rate controls the step size taken in the direction opposite the loss gradient.

# Mean Squared Error and Mean Absolute Error
Mean Squared Error (MSE) is the average of squared differences between target and prediction.
Mean Absolute Error (MAE) is the average absolute difference between target and prediction.
Squaring residuals makes MSE more sensitive to large errors than MAE.

# Bayesian Knowledge Tracing
Bayesian Knowledge Tracing (BKT) maintains a probability that a learner has mastered a skill.
It updates that estimate after each correct or incorrect response.
The model uses prior mastery, learning transition, guess, and slip probabilities.

# Scaled Dot-Product Attention
Scaled dot-product attention computes QK-transpose divided by sqrt(d_k).
It applies softmax to the scaled scores and multiplies the resulting weights by V.
The scale helps keep dot-product magnitudes from growing too large as key dimension increases.
The attention output is a weighted combination of the value vectors.
