from flask import Flask, request, jsonify
from flask_cors import CORS
from model import categorize
import json
import traceback

app = Flask(__name__)

# app.use(cors())

CORS(app, resources={r"/*": {"origins": "https://samsung-hackathon.onrender.com"}})
@app.route('/categorize', methods=['POST'] )
def categorize_incident():
    print("hello")
    data = request.get_json()
    print(data)
    if not data or 'description' not in data:
        return jsonify({'error': 'Invalid input'}), 400

    description = data['description']
    
    try:
        result = categorize(description)
        print(result)
        result_dict = json.loads(result)  # ✅ convert JSON string to dict
        return jsonify(result_dict)
    except Exception as e:
        import traceback
        traceback.print_exc()  # helpful debug
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)