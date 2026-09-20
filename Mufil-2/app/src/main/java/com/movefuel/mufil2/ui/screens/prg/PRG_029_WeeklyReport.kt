package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG029WeeklyReportScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_029",
        title = "Weekly Report",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_030,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_028,
        onNavigate = onNavigate,
    ) {
            MFGraphCard("This week","Training and nutrition overview")
            MFListItem("Training","3 workouts completed","View")
            MFListItem("Nutrition","92% data coverage","View")
            MFListItem("Next week","1 suggested adjustment","Review")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG029WeeklyReportScreenPreview() {
    MoveFuelTheme { PRG029WeeklyReportScreen {} }
}
