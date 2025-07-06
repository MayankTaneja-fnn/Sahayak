# pip install groq
from groq import Groq
from dotenv import load_dotenv
import os



client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

def categorize(description):
  completion = client.chat.completions.create(
      model="llama3-70b-8192",
      messages=[
        {
          "role": "system",
          "content":"""
  You will be given an incident summary from a portal. Your task is to classify the incident based on its urgency:

  0 for Green (low urgency: general help, minor issue, no impact)  
  1 for Orange (moderate urgency: service disruption, potential risk, needs timely attention)  
  2 for Red (high urgency: accident, safety threat, severe impact)

  Output the result in valid JSON format only, containing two fields:
  1. "urgency" – an integer (0, 1, or 2) representing the urgency level  
  2. "summary" – a brief 4–5 word summary of the incident

  Format:

  {
    "urgency": 1,
    "summary": "brief incident summary"
  }

  Do not include any explanations, text, or formatting other than the valid JSON.

  Examples:

  Input:  
  A fire alarm was triggered in Block C due to smoke detected in the server room. All personnel were evacuated and fire services are en route.  
  Output:  
  {
    "urgency": 2,
    "summary": "fire alarm in server room"
  }

  Input:  
  Several users reported intermittent access to the attendance portal. Services are partially available but experience delays during peak hours.  
  Output:  
  {
    "urgency": 1,
    "summary": "attendance portal access issue"
  }

  Input:  
  User is unable to locate the logout option on the dashboard and needs help navigating the settings menu.  
  Output:  
  {
    "urgency": 0,
    "summary": "logout option help request"
  }
  """

        },
        {
          "role": "user",
          "content": description # input here
        }
      ],
      temperature=1,
      max_tokens=1024,
      top_p=1,
      stream=True,
      stop=None,
  )
  response = ""
  for chunk in completion:
      delta = chunk.choices[0].delta.content or ""
      print(delta, end="")
      response += delta
  return response


# for chunk in completion:
#     print(chunk.choices[0].delta.content or "", end="")
