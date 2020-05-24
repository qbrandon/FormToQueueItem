# diagram.py (https://diagrams.mingrammer.com/)
from diagrams import Diagram
from diagrams.programming.language import Javascript
from diagrams.gcp.compute import GCF
from diagrams.onprem.compute import Server
from diagrams.onprem.client import Client

with Diagram("Google Form to Queue Item", show=False):
    Javascript("Apps Script") >> GCF("Cloud Functions") >> Server("Orcherstrator") >> Client("UiPath Robot")