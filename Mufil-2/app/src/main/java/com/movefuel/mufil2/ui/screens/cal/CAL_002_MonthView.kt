package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL002MonthViewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_002",
        title = "Month View",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_001,
        onNavigate = onNavigate,
    ) {
            MFCalendarMini()
            MFNotice("No month events", "Calendar entries remain unavailable until canonical sources provide them.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL002MonthViewScreenPreview() {
    MoveFuelTheme { CAL002MonthViewScreen {} }
}
