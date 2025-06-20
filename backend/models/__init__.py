from .typing_session import TypingSession
from .user_stats import UserStats

# Import Achievement and Goal only if the files exist
try:
    from .achievement import Achievement
except ImportError:
    Achievement = None

try:
    from .goal import Goal
except ImportError:
    Goal = None

__all__ = ['TypingSession', 'UserStats']

# Add to __all__ only if successfully imported
if Achievement is not None:
    __all__.append('Achievement')
if Goal is not None:
    __all__.append('Goal')