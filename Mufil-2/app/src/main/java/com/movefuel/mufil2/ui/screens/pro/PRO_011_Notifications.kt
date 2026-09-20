package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO011NotificationsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_011",
        title = "Notifications",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_010,
        onNavigate = onNavigate,
    ) {
            MFToggleRow("Workout reminders","Scheduled workout reminders.",true)
            MFToggleRow("Meal-plan reminders","Only for active meal plans.",false)
            MFToggleRow("Important sync alerts","Failures and required review.",true)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO011NotificationsScreenPreview() {
    MoveFuelTheme { PRO011NotificationsScreen {} }
}
