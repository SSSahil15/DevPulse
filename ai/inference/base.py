from abc import ABC, abstractmethod
from typing import Optional, Any
from models.domain import RepositoryMetadata

class PredictorInterface(ABC):
    """
    Base interface for all inference and heuristic predictors.
    """

    @abstractmethod
    def predict(self, repository: RepositoryMetadata, security_scan: Optional[dict] = None) -> dict[str, Any]:
        """
        Produce an analysis result including risk score and predictions.
        
        Args:
            repository: Metadata about the repository.
            security_scan: Optional security scan results.
            
        Returns:
            A dictionary conforming to the AnalysisResponse structure.
        """
        pass

    @abstractmethod
    def model_info(self) -> dict[str, Any]:
        """
        Returns metadata about this predictor.
        """
        pass
