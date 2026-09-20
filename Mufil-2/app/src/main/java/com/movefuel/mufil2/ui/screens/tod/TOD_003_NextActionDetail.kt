package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD003NextActionDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_003",
        title = "Next Action Detail",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_002,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Priority", "Lunch is ready to review and log.")
            MFListItem("Planned lunch", "Chicken rice bowl · planned", "Review")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD003NextActionDetailScreenPreview() {
    MoveFuelTheme { TOD003NextActionDetailScreen {} }
}
